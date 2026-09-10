import { database } from '@/db/client';
import { validateMission } from '@/lib/mission-input';
import type { MissionRecord } from '@/db/missions';
import { snapshotStatement } from '@/db/mission-revisions';
import { defaultMissionTools } from '@/lib/mission-tools';
import {
  ensureRepository,
  readCommit,
  prepareCommit,
  missionDefinition,
  type Repo,
} from '@/db/mission-git';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function identity(req: Request) {
  return req.headers.get('oai-authenticated-user-email')
    ? req.headers.get('oai-authenticated-user-id')
    : null;
}
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    const user = identity(req);
    if (id) {
      const m = await database()
        .prepare('SELECT * FROM community_missions WHERE id=?')
        .bind(id)
        .first<MissionRecord>();
      if (!m) return json({ error: 'Mission not found.' }, 404);
      const { owner_id, ...rest } = m;
      return json({
        mission: {
          ...rest,
          roles: JSON.parse(m.roles),
          steps: JSON.parse(m.steps),
        },
        canEdit: user === owner_id,
        signedIn: !!user,
      });
    }
    const rows = await database()
      .prepare(
        'SELECT id,title,category,description,intent,revision,created_at FROM community_missions ORDER BY created_at DESC LIMIT 200',
      )
      .all();
    return json({ missions: rows.results, signedIn: !!user });
  } catch {
    return json(
      { error: 'Missions could not be loaded. Please try again.' },
      503,
    );
  }
}
export async function POST(req: Request) {
  const user = identity(req);
  if (!user)
    return json({ error: 'Sign in to create or edit a mission.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Invalid request format.' }, 415);
  try {
    const raw = await req.text();
    if (raw.length > 10000)
      return json({ error: 'The mission is too long.' }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    let fork: Repo | null = null;
    if (body?.action === 'fork') {
      if (typeof body.sourceMission !== 'string')
        return json({ error: 'Choose a source mission.' }, 400);
      const source = await missionDefinition(body.sourceMission);
      if (!source) return json({ error: 'Source mission not found.' }, 404);
      fork = await ensureRepository(body.sourceMission);
      if (typeof body.id === 'string') {
        const prior = await database()
          .prepare(
            'SELECT m.owner_id,r.upstream,r.fork_base FROM community_missions m JOIN mission_repositories r ON r.mission=m.id WHERE m.id=?',
          )
          .bind(body.id)
          .first<{ owner_id: string; upstream: string; fork_base: string }>();
        if (
          prior &&
          prior.owner_id === user &&
          prior.upstream === body.sourceMission &&
          prior.fork_base === body.baseOid
        )
          return json({ id: body.id });
      }
      if (fork.fork_policy !== 'allowed')
        return json(
          { error: 'This mission was created with forks disabled.' },
          403,
        );
      if (body.baseOid !== fork.head)
        return json(
          {
            error:
              'The source mission changed. Refresh its history before forking.',
          },
          409,
        );
      body = {
        ...body,
        action: 'create',
        forkPolicy: fork.fork_policy,
        mission: { ...source, title: body.title },
      };
    }
    const input = validateMission(body?.mission);
    if (!input)
      return json(
        {
          error:
            'Complete the mission fields and provide 1–6 distinct ways to help and next steps.',
        },
        400,
      );
    const { title, category, description, outcome, roles, steps, intent } =
      input;
    const db = database(),
      now = new Date().toISOString();
    let author =
      req.headers.get('oai-authenticated-user-full-name') || 'Mission creator';
    if (
      req.headers.get('oai-authenticated-user-full-name-encoding') ===
      'percent-encoded-utf-8'
    ) {
      try {
        author = decodeURIComponent(author);
      } catch {
        author = 'Mission creator';
      }
    }
    author = author.slice(0, 100);
    if (body.action === 'create') {
      if (
        typeof body.id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          body.id,
        )
      )
        return json({ error: 'Invalid mission ID.' }, 400);
      const previous = await db
        .prepare('SELECT owner_id FROM community_missions WHERE id=?')
        .bind(body.id)
        .first();
      if (previous)
        return previous.owner_id === user
          ? json({ id: body.id })
          : json({ error: 'Mission ID already exists.' }, 409);
      const forkPolicy =
        body.forkPolicy ?? (intent === 'community' ? 'allowed' : 'closed');
      const count = await db
        .prepare(
          'SELECT COUNT(*) AS count FROM community_missions WHERE owner_id=?',
        )
        .bind(user)
        .first<{ count: number }>();
      if ((count?.count || 0) >= 20)
        return json(
          { error: 'You have reached the pilot limit of 20 missions.' },
          409,
        );
      if (!['allowed', 'closed'].includes(forkPolicy))
        return json({ error: 'Choose whether forks are allowed.' }, 400);
      let inheritedFiles: Record<string, string> | undefined;
      if (fork) {
        inheritedFiles = { ...(await readCommit(fork.head)).files };
        inheritedFiles['mission-tools.json'] ??= JSON.stringify(
          { requirements: defaultMissionTools(fork.mission) },
          null,
          2,
        );
      }
      const commit = await prepareCommit(
        body.id,
        { mission: body.id, ...input, forkPolicy },
        fork?.head || null,
        author,
        fork ? 'Fork mission from ' + fork.mission : 'Create mission',
        now,
        inheritedFiles,
      );
      const results = await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO community_missions (id,owner_id,title,category,description,outcome,roles,steps,intent,revision,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,1,?,? WHERE (SELECT COUNT(*) FROM community_missions WHERE owner_id=?)<20',
          )
          .bind(
            body.id,
            user,
            title,
            category,
            description,
            outcome,
            JSON.stringify(roles),
            JSON.stringify(steps),
            intent,
            now,
            now,
            user,
          ),
        snapshotStatement(body.id, 1, now, author, 'Created mission'),
        commit.statement,
        db
          .prepare(
            'INSERT OR IGNORE INTO mission_repositories (mission,head,fork_policy,upstream,fork_base) SELECT id,?,?,?,? FROM community_missions WHERE id=? AND owner_id=? AND created_at=?',
          )
          .bind(
            commit.row.oid,
            forkPolicy,
            fork?.mission || null,
            fork?.head || null,
            body.id,
            user,
            now,
          ),
      ]);
      if (!results[0].meta.changes)
        return json(
          { error: 'You have reached the pilot limit of 20 missions.' },
          409,
        );
      return json({ id: body.id }, 201);
    }
    if (body.action === 'edit') {
      const old = await db
        .prepare('SELECT * FROM community_missions WHERE id=?')
        .bind(typeof body.id === 'string' ? body.id : '')
        .first<MissionRecord>();
      if (!old) return json({ error: 'Mission not found.' }, 404);
      if (old.owner_id !== user)
        return json(
          { error: 'Only the mission creator can edit these details.' },
          403,
        );
      if (!Number.isInteger(body.revision) || body.revision !== old.revision)
        return json(
          {
            error:
              'This mission changed while you were editing. Reload before saving.',
          },
          409,
        );
      if (old.intent !== intent)
        return json(
          {
            error: 'A mission’s declared commercial intent cannot be changed.',
          },
          409,
        );
      if (
        (JSON.parse(old.roles) as string[]).some(
          (role) => !roles.includes(role),
        )
      )
        return json(
          {
            error:
              'Keep existing ways to help so earlier commitments remain meaningful. You can add new ones.',
          },
          409,
        );
      const repo = await ensureRepository(old.id);
      const commit = await prepareCommit(
        old.id,
        { mission: old.id, ...input, forkPolicy: repo.fork_policy },
        repo.head,
        author,
        'Update mission brief',
        now,
      );
      const result = await db.batch([
        snapshotStatement(
          old.id,
          old.revision,
          old.updated_at,
          'Mission creator',
          'Brief baseline captured before edit',
        ),
        db
          .prepare(
            'UPDATE community_missions SET title=?,category=?,description=?,outcome=?,roles=?,steps=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?)',
          )
          .bind(
            title,
            category,
            description,
            outcome,
            JSON.stringify(roles),
            JSON.stringify(steps),
            now,
            old.id,
            user,
            body.revision,
            old.id,
            repo.head,
          ),
        snapshotStatement(
          old.id,
          old.revision + 1,
          now,
          author,
          'Updated mission brief',
        ),
        commit.statement,
        db
          .prepare(
            'UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND EXISTS(SELECT 1 FROM community_missions WHERE id=? AND revision=? AND updated_at=?)',
          )
          .bind(
            commit.row.oid,
            old.id,
            repo.head,
            old.id,
            old.revision + 1,
            now,
          ),
      ]);
      if (!result[1].meta.changes)
        return json(
          {
            error:
              'This mission changed while you were editing. Reload before saving.',
          },
          409,
        );
      return json({ id: old.id });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch {
    return json(
      { error: 'The mission could not be saved. Your draft is still here.' },
      503,
    );
  }
}
