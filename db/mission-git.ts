import { database, bucket } from '@/db/client';
import { getMission } from '@/db/missions';
import { createObjects, gitBundle } from '@/lib/git-format';
export type Repo = {
  mission: string;
  head: string;
  fork_policy: string;
  upstream: string | null;
  fork_base: string | null;
};
export type Commit = {
  oid: string;
  parent: string | null;
  mission: string;
  author: string;
  message: string;
  created_at: string;
  depth: number;
};
export async function readCommit(oid: string) {
  const object = await bucket().get('mission-git/' + oid);
  if (!object) throw Error('Missing Git object');
  const data = JSON.parse(await new Response(object.body).text()) as {
    blob: string;
    commit: string;
    files?: Record<string, string>;
  };
  return { ...data, files: { ...data.files, 'mission.json': data.blob } };
}
export async function missionDefinition(mission: string) {
  if (mission === 'mahabharata')
    return {
      title: 'Make the epic playable.',
      category: 'Creative worlds',
      description:
        'A community-built Mahabharata game, beginning with a playable interpretation of Day 14.',
      outcome:
        'Build a small playable interpretation of Day 14: Arjuna, Gandiva, and the urgency of a setting sun.',
      roles: ['Lore research', 'Creative direction', 'Gameplay mechanics'],
      steps: ['Build the first playable scene'],
      intent: 'community',
      revision: 1,
    };
  return getMission(mission);
}
export async function prepareCommit(
  mission: string,
  snapshot: unknown,
  parent: string | null,
  author: string,
  message: string,
  stamp: string,
  files?: Record<string, string>,
) {
  const prior = parent
    ? await database()
        .prepare('SELECT depth FROM git_commits WHERE oid=?')
        .bind(parent)
        .first<{ depth: number }>()
    : null;
  if (parent && !prior) throw Error('Missing parent commit');
  if ((prior?.depth || 0) >= 200)
    throw Error('This pilot supports 200 commits in a mission ancestry');
  const inherited = files ?? (parent ? (await readCommit(parent)).files : {});
  const object = await createObjects(
    snapshot,
    parent,
    author,
    message,
    stamp,
    inherited,
  );
  if (
    Object.values(object.files).reduce(
      (sum, text) => sum + new TextEncoder().encode(text).length,
      0,
    ) > 65536
  )
    throw Error(
      'The workspace is over 64 KB. Shorten or remove a working file before adding more content.',
    );
  await bucket().put(
    'mission-git/' + object.oid,
    JSON.stringify({
      blob: object.blob,
      commit: object.commit,
      files: object.files,
    }),
  );
  const row: Commit = {
    oid: object.oid,
    parent,
    mission,
    author,
    message,
    created_at: stamp,
    depth: (prior?.depth || 0) + 1,
  };
  return {
    row,
    statement: database()
      .prepare(
        'INSERT OR IGNORE INTO git_commits (oid,parent,mission,author,message,created_at,depth) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(row.oid, parent, mission, author, message, stamp, row.depth),
  };
}
export async function ensureRepository(mission: string): Promise<Repo> {
  const db = database();
  const existing = await db
    .prepare('SELECT * FROM mission_repositories WHERE mission=?')
    .bind(mission)
    .first<Repo>();
  if (existing) return existing;
  const m = await missionDefinition(mission);
  if (!m) throw Error('Mission not found');
  const forkPolicy = m.intent === 'community' ? 'allowed' : 'closed';
  const snapshot = {
    mission,
    title: m.title,
    category: m.category,
    description: m.description,
    outcome: m.outcome,
    roles: m.roles,
    steps: m.steps,
    intent: m.intent,
    forkPolicy,
    baselineRevision: m.revision,
  };
  const prepared = await prepareCommit(
    mission,
    snapshot,
    null,
    'Collaborator',
    'Capture current mission baseline; earlier versions unavailable',
    new Date().toISOString(),
  );
  await db.batch([
    prepared.statement,
    db
      .prepare(
        'INSERT OR IGNORE INTO mission_repositories (mission,head,fork_policy) VALUES (?,?,?)',
      )
      .bind(mission, prepared.row.oid, forkPolicy),
  ]);
  return (await db
    .prepare('SELECT * FROM mission_repositories WHERE mission=?')
    .bind(mission)
    .first<Repo>())!;
}
export async function ancestry(head: string) {
  return (
    await database()
      .prepare(
        'WITH RECURSIVE history AS (SELECT * FROM git_commits WHERE oid=? UNION ALL SELECT c.* FROM git_commits c JOIN history h ON c.oid=h.parent) SELECT * FROM history LIMIT 201',
      )
      .bind(head)
      .all<Commit>()
  ).results;
}
export async function exportRepository(repo: Repo) {
  const commits = await ancestry(repo.head);
  if (
    !commits.length ||
    commits.length > 200 ||
    commits[commits.length - 1].parent
  )
    throw Error('Incomplete repository history');
  const records: { oid: string; blob: string; commit: string }[] = [];
  for (let i = 0; i < commits.length; i += 8) {
    const chunk = await Promise.all(
      commits.slice(i, i + 8).map(async (c) => {
        const object = await bucket().get('mission-git/' + c.oid);
        if (!object) throw Error('Missing Git object');
        const data = JSON.parse(await new Response(object.body).text()) as {
          blob: string;
          commit: string;
        };
        return { oid: c.oid, ...data };
      }),
    );
    records.push(...chunk);
  }
  return gitBundle(repo.head, records);
}
