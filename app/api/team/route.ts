import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { ensureRepository, readCommit, prepareCommit } from '@/db/mission-git';
import { boundedBody } from '@/lib/artifacts';
import { moduleKey, validModule } from '@/lib/teams';
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
type Member = { id: string; user_id: string; name: string; active: number };
type Lead = {
  id: string;
  module: string;
  member_id: string | null;
  revision: number;
};
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database();
    const members = (
      await db
        .prepare(
          'SELECT id,user_id,name,active FROM mission_members WHERE mission=? AND active=1 ORDER BY joined_at LIMIT 200',
        )
        .bind(mission)
        .all<Member>()
    ).results;
    const leads = (
      await db
        .prepare(
          'SELECT id,module,member_id,revision FROM mission_leads WHERE mission=? ORDER BY module LIMIT 40',
        )
        .bind(mission)
        .all<Lead>()
    ).results;
    const modules = (
      await db
        .prepare(
          'SELECT DISTINCT p.module FROM planned_tasks p JOIN mission_actions a ON a.id=p.action_id WHERE a.mission=? ORDER BY p.module LIMIT 40',
        )
        .bind(mission)
        .all<{ module: string }>()
    ).results.map((r) => r.module);
    return json({
      members: members.map(({ user_id, ...m }) => ({
        ...m,
        mine: user_id === access.id,
      })),
      leads,
      modules,
      owner: access.owner,
      signedIn: !!access.id,
    });
  } catch {
    return json({ error: 'Team could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Origin not allowed.' }, 403);
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to join a mission.' }, 401);
  try {
    let d;
    try {
      d = JSON.parse(new TextDecoder().decode(await boundedBody(req, 5000)));
    } catch {
      return json({ error: 'Invalid team request.' }, 400);
    }
    if (!d || typeof d.mission !== 'string')
      return json({ error: 'Invalid mission.' }, 400);
    const access = await missionAccess(req, d.mission);
    if (!access?.id) return json({ error: 'Mission not found.' }, 404);
    const db = database(),
      now = new Date().toISOString();
    if (d.operation === 'join') {
      const result = await db
        .prepare(
          'INSERT INTO mission_members(id,mission,user_id,name,active,joined_at) SELECT ?,?,?,?,1,? WHERE (SELECT COUNT(*) FROM mission_members WHERE mission=? AND active=1)<200 OR EXISTS(SELECT 1 FROM mission_members WHERE mission=? AND user_id=? AND active=1) ON CONFLICT(mission,user_id) DO UPDATE SET active=1,name=excluded.name',
        )
        .bind(
          crypto.randomUUID(),
          d.mission,
          access.id,
          access.author,
          now,
          d.mission,
          d.mission,
          access.id,
        )
        .run();
      return result.meta.changes
        ? json({ saved: true })
        : json({ error: 'The pilot community is full.' }, 409);
    }
    if (d.operation === 'leave') {
      if (access.owner)
        return json(
          {
            error:
              'The mission owner retains responsibility for this community.',
          },
          409,
        );
      const result = await db
        .prepare(
          'UPDATE mission_members SET active=0 WHERE mission=? AND user_id=? AND active=1 AND NOT EXISTS(SELECT 1 FROM mission_leads WHERE member_id=mission_members.id)',
        )
        .bind(d.mission, access.id)
        .run();
      return result.meta.changes
        ? json({ saved: true })
        : json(
            {
              error:
                'Ask the owner to revoke your lead roles before leaving, or refresh your membership.',
            },
            409,
          );
    }
    if (d.operation !== 'lead' || !access.owner)
      return json(
        {
          error:
            'Only the mission owner can assign or revoke subdivision leads.',
        },
        403,
      );
    if (
      !validModule(d.module) ||
      !Number.isInteger(d.revision) ||
      (d.memberId !== null && typeof d.memberId !== 'string')
    )
      return json({ error: 'Choose a subdivision and a current member.' }, 400);
    const module = moduleKey(d.module),
      members = (
        await db
          .prepare(
            'SELECT id,user_id,name,active FROM mission_members WHERE mission=? AND active=1',
          )
          .bind(d.mission)
          .all<Member>()
      ).results;
    if (d.memberId !== null && !members.some((m) => m.id === d.memberId))
      return json({ error: 'Choose an active member of this mission.' }, 400);
    const leads = (
        await db
          .prepare(
            'SELECT id,module,member_id,revision FROM mission_leads WHERE mission=?',
          )
          .bind(d.mission)
          .all<Lead>()
      ).results,
      old = leads.find((l) => l.module === module);
    if ((old?.revision || 0) !== d.revision)
      return json({ error: 'This role changed. Refresh first.' }, 409);
    if (!old && leads.length >= 40)
      return json({ error: 'The pilot supports 40 subdivisions.' }, 409);
    const next = [
      ...leads.filter((l) => l.module !== module),
      {
        id: old?.id || crypto.randomUUID(),
        module,
        member_id: d.memberId,
        revision: d.revision + 1,
      },
    ];
    const repo = await ensureRepository(d.mission),
      prior = await readCommit(repo.head),
      files = {
        ...prior.files,
        'mission-team.json': JSON.stringify(
          {
            subdivisions: next.map((l) => ({
              module: l.module,
              lead: members.find((m) => m.id === l.member_id)?.name || null,
              revision: l.revision,
            })),
            updatedBy: access.author,
          },
          null,
          2,
        ),
      };
    const commit = await prepareCommit(
      d.mission,
      JSON.parse(prior.blob),
      repo.head,
      access.author,
      d.memberId ? 'Assign subdivision lead' : 'Revoke subdivision lead',
      now,
      files,
    );
    const changed = next.find((l) => l.module === module)!;
    const results = await db.batch([
      commit.statement,
      db
        .prepare(
          'UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND COALESCE((SELECT revision FROM mission_leads WHERE mission=? AND module=?),0)=? AND (? IS NULL OR EXISTS(SELECT 1 FROM mission_members WHERE id=? AND mission=? AND active=1))',
        )
        .bind(
          commit.row.oid,
          d.mission,
          repo.head,
          d.mission,
          module,
          d.revision,
          d.memberId,
          d.memberId,
          d.mission,
        ),
      db
        .prepare(
          'INSERT INTO mission_leads(id,mission,module,member_id,revision,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?) ON CONFLICT(mission,module) DO UPDATE SET member_id=excluded.member_id,revision=excluded.revision,updated_at=excluded.updated_at',
        )
        .bind(
          changed.id,
          d.mission,
          module,
          d.memberId,
          d.revision + 1,
          now,
          d.mission,
          commit.row.oid,
        ),
    ]);
    return results[1].meta.changes
      ? json({ saved: true })
      : json(
          { error: 'The mission or member changed. Refresh and retry.' },
          409,
        );
  } catch {
    return json({ error: 'Team change could not be saved.' }, 503);
  }
}
