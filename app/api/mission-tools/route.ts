import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { ensureRepository, readCommit, prepareCommit } from '@/db/mission-git';
import { defaultMissionTools, validRequirements } from '@/lib/mission-tools';
import { boundedBody } from '@/lib/artifacts';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const row = await database()
      .prepare('SELECT * FROM mission_toolsets WHERE mission=?')
      .bind(mission)
      .first<{ requirements: string; revision: number }>();
    let requirements = row
      ? JSON.parse(row.requirements)
      : defaultMissionTools(mission);
    if (!row) {
      const repo = await ensureRepository(mission);
      const inherited = (
        (await readCommit(repo.head)).files as Record<
          string,
          string
        >
      )['mission-tools.json'];
      if (inherited) {
        const parsed = JSON.parse(inherited).requirements;
        if (validRequirements(parsed)) requirements = parsed;
      }
    }
    return json({
      requirements,
      revision: row?.revision || 0,
      canEdit: access.owner,
    });
  } catch {
    return json({ error: 'Tool requirements could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Origin not allowed.' }, 403);
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to edit requirements.' }, 401);
  try {
    let d;
    try {
      d = JSON.parse(new TextDecoder().decode(await boundedBody(req, 10000)));
    } catch {
      return json({ error: 'Invalid requirements.' }, 400);
    }
    if (
      !d ||
      typeof d.mission !== 'string' ||
      !Number.isInteger(d.revision) ||
      !validRequirements(d.requirements)
    )
      return json(
        { error: 'Use up to 12 distinct tool IDs, names, and purposes.' },
        400,
      );
    const access = await missionAccess(req, d.mission);
    if (!access?.owner)
      return json(
        { error: 'Only the mission maintainer can edit its requirements.' },
        403,
      );
    const db = database(),
      old = await db
        .prepare('SELECT revision FROM mission_toolsets WHERE mission=?')
        .bind(d.mission)
        .first<{ revision: number }>();
    if ((old?.revision || 0) !== d.revision)
      return json(
        { error: 'Requirements changed. Refresh before editing.' },
        409,
      );
    const repo = await ensureRepository(d.mission),
      prior = await readCommit(repo.head),
      files = {
        ...prior.files,
        'mission-tools.json': JSON.stringify(
          { requirements: d.requirements },
          null,
          2,
        ),
      };
    if (
      Object.keys(files).filter(
        (p) => !['mission.json', 'mission-tools.json'].includes(p),
      ).length > 12
    )
      return json(
        { error: 'The workspace is full. Remove a working file first.' },
        409,
      );
    const commit = await prepareCommit(
      d.mission,
      JSON.parse(prior.blob),
      repo.head,
      access.author,
      'Update mission tool requirements',
      new Date().toISOString(),
      files,
    );
    const results = await db.batch([
      commit.statement,
      db
        .prepare(
          'UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND COALESCE((SELECT revision FROM mission_toolsets WHERE mission=?),0)=?',
        )
        .bind(commit.row.oid, d.mission, repo.head, d.mission, d.revision),
      db
        .prepare(
          'INSERT INTO mission_toolsets (mission,requirements,revision) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?) ON CONFLICT(mission) DO UPDATE SET requirements=excluded.requirements,revision=excluded.revision WHERE mission_toolsets.revision=?',
        )
        .bind(
          d.mission,
          JSON.stringify(d.requirements),
          d.revision + 1,
          d.mission,
          commit.row.oid,
          d.revision,
        ),
    ]);
    return results[1].meta.changes
      ? json({ saved: true })
      : json({ error: 'The mission changed. Refresh and retry.' }, 409);
  } catch {
    return json({ error: 'Requirements could not be saved.' }, 503);
  }
}
