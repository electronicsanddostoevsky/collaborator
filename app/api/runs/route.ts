import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
type Run = {
  id: string;
  mission: string;
  user_id: string;
  author: string;
  task_id: string | null;
  task_revision: number | null;
  tool: string;
  model: string;
  status: string;
  updated_at: string;
  created_at: string;
};
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '';
    const access = await missionAccess(req, mission);
    if (!access?.id)
      return json({ error: 'Sign in to see contributions.' }, 401);
    const rows = (
      await database()
        .prepare(
          'SELECT r.*,a.title task_title FROM contributor_runs r LEFT JOIN mission_actions a ON a.id=r.task_id WHERE r.mission=? ORDER BY r.created_at DESC,r.id DESC LIMIT 100',
        )
        .bind(mission)
        .all<Run>()
    ).results;
    const elsewhere = (
      await database()
        .prepare(
          "SELECT r.id,r.mission,COALESCE(m.title,r.mission) title FROM contributor_runs r LEFT JOIN community_missions m ON m.id=r.mission WHERE r.user_id=? AND r.status='active' AND r.mission!=?",
        )
        .bind(access.id, mission)
        .all()
    ).results;
    return json({
      elsewhere,
      runs: rows.map(({ user_id, ...r }) => ({
        ...r,
        mine: user_id === access.id,
        stale:
          r.status === 'active' &&
          Date.now() - Date.parse(r.updated_at) > 90000,
      })),
    });
  } catch {
    return json(
      { error: 'Contribution status is temporarily unavailable.' },
      503,
    );
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to contribute your agent.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Origin not allowed.' }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 10000) return json({ error: 'Request too large.' }, 413);
    const d = JSON.parse(raw);
    if (!d || typeof d.mission !== 'string' || !uuid(d.id))
      return json({ error: 'Invalid run.' }, 400);
    const access = await missionAccess(req, d.mission);
    if (!access?.id) return json({ error: 'Mission not found.' }, 404);
    const db = database(),
      now = new Date().toISOString();
    const prior = await db
      .prepare('SELECT * FROM contributor_runs WHERE id=?')
      .bind(d.id)
      .first<Run>();
    if (prior && (prior.user_id !== access.id || prior.mission !== d.mission))
      return json({ error: 'This run belongs to another contributor.' }, 403);
    if (d.operation === 'begin') {
      if (!access.canReply)
        return json(
          {
            error:
              'Join this mission’s community before contributing your agent.',
          },
          403,
        );
      if (
        typeof d.tool !== 'string' ||
        !/^[a-z][a-z0-9-]{1,39}$/.test(d.tool) ||
        typeof d.model !== 'string' ||
        !d.model ||
        d.model.length > 120 ||
        (d.taskId && !uuid(d.taskId))
      )
        return json({ error: 'Choose a tool and an agent.' }, 400);
      const task = d.taskId || null,
        revision = task ? d.taskRevision : null;
      if (prior)
        return prior.tool === d.tool &&
          prior.model === d.model &&
          prior.task_id === task &&
          prior.task_revision === revision &&
          prior.status === 'active'
          ? json({ saved: true })
          : json(
              {
                error:
                  'This run already finished or its details changed. Start a new run.',
              },
              409,
            );
      if (
        task &&
        (!Number.isInteger(revision) ||
          !(await db
            .prepare(
              "SELECT id FROM mission_actions WHERE id=? AND mission=? AND assignee_id=? AND revision=? AND status='doing'",
            )
            .bind(task, d.mission, access.id, revision)
            .first()))
      )
        return json(
          { error: 'Claim the current task before running your agent.' },
          409,
        );
      const result = await db
        .prepare(`INSERT INTO contributor_runs(id,mission,user_id,author,task_id,task_revision,tool,model,status,created_at,updated_at)
        SELECT ?,?,?,?,?,?,?,?,'active',?,? WHERE NOT EXISTS(SELECT 1 FROM contributor_runs WHERE user_id=? AND status='active')
        AND (SELECT COUNT(*) FROM contributor_runs WHERE user_id=? AND created_at>=?)<30
        AND (? IS NULL OR EXISTS(SELECT 1 FROM mission_actions WHERE id=? AND mission=? AND assignee_id=? AND revision=? AND status='doing'))`)
        .bind(
          d.id,
          d.mission,
          access.id,
          access.author,
          task,
          revision,
          d.tool,
          d.model,
          now,
          now,
          access.id,
          access.id,
          now.slice(0, 10),
          task,
          task,
          d.mission,
          access.id,
          revision,
        )
        .run();
      return result.meta.changes
        ? json({ saved: true }, 201)
        : json(
            {
              error:
                'You have an unresolved run on this or another mission, or have reached 30 runs today. Reconnect its computer or close its tracking before starting another.',
            },
            409,
          );
    }
    if (!prior) return json({ error: 'Run not found.' }, 404);
    if (d.operation === 'close') {
      if (d.confirmStopped !== true)
        return json(
          {
            error:
              'Confirm that you stopped or checked the run on its computer.',
          },
          400,
        );
      await db
        .prepare(
          "UPDATE contributor_runs SET status='closed',updated_at=? WHERE id=? AND user_id=? AND status='active'",
        )
        .bind(now, d.id, access.id)
        .run();
      return json({ saved: true });
    }
    if (
      d.operation === 'report' &&
      ['active', 'ready', 'failed', 'stopped'].includes(d.status)
    ) {
      // Reports describe progress, never grant approval or complete a mission task.
      await db
        .prepare(
          "UPDATE contributor_runs SET status=?,updated_at=? WHERE id=? AND user_id=? AND status='active'",
        )
        .bind(d.status, now, d.id, access.id)
        .run();
      return json({ saved: true });
    }
    return json({ error: 'Unknown run operation.' }, 400);
  } catch {
    return json(
      {
        error:
          'The run could not be recorded. No new local run should be started until this is resolved.',
      },
      503,
    );
  }
}
