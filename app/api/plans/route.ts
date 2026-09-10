import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { ensureRepository, readCommit, prepareCommit } from '@/db/mission-git';
import { boundedBody } from '@/lib/artifacts';
import { validPlan, type WorkPlan } from '@/lib/planning';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
type Row = {
  id: string;
  mission: string;
  user_id: string;
  author: string;
  brief: string;
  model: string;
  body: string;
  status: string;
  revision: number;
  feedback: string;
  reviewer: string | null;
  head: string | null;
};
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const rows = await database()
      .prepare(
        'SELECT * FROM mission_plans WHERE mission=? ORDER BY created_at DESC,id DESC LIMIT 40',
      )
      .bind(mission)
      .all<Row>();
    return json({
      canPropose: access.canReply,
      canApprove: access.owner,
      plans: rows.results.map(({ user_id, ...r }) => ({
        ...r,
        body: JSON.parse(r.body),
        mine: user_id === access.id,
      })),
    });
  } catch {
    return json({ error: 'Plans could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Origin not allowed.' }, 403);
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to propose work.' }, 401);
  try {
    let d;
    try {
      d = JSON.parse(new TextDecoder().decode(await boundedBody(req, 30000)));
    } catch {
      return json({ error: 'Invalid plan or plan too large.' }, 400);
    }
    if (!d || !uuid(d.id) || typeof d.mission !== 'string')
      return json({ error: 'Invalid plan.' }, 400);
    const access = await missionAccess(req, d.mission);
    if (!access?.canReply)
      return json({ error: 'Join this mission before proposing work.' }, 403);
    const db = database(),
      now = new Date().toISOString();
    const old = await db
      .prepare('SELECT * FROM mission_plans WHERE id=?')
      .bind(d.id)
      .first<Row>();
    if (old && old.mission !== d.mission)
      return json({ error: 'Plan belongs to another mission.' }, 409);
    if (d.operation === 'propose') {
      if (
        !validPlan(d.body) ||
        typeof d.brief !== 'string' ||
        d.brief.length < 10 ||
        d.brief.length > 4000 ||
        typeof d.model !== 'string' ||
        d.model.length > 100
      )
        return json(
          {
            error:
              'Use 1–12 well-defined tasks with unique keys and no circular dependencies.',
          },
          400,
        );
      const body = JSON.stringify(d.body);
      if (old)
        return old.user_id === access.id &&
          old.body === body &&
          old.brief === d.brief &&
          old.model === d.model
          ? json({ saved: true })
          : json({ error: 'This proposal ID is already used.' }, 409);
      const result = await db
        .prepare(
          "INSERT INTO mission_plans(id,mission,user_id,author,brief,model,body,status,revision,feedback,created_at,updated_at) SELECT ?,?,?,?,?,?,?,'proposed',1,'',?,? WHERE (SELECT COUNT(*) FROM mission_plans WHERE mission=?)<40",
        )
        .bind(
          d.id,
          d.mission,
          access.id,
          access.author,
          d.brief,
          d.model,
          body,
          now,
          now,
          d.mission,
        )
        .run();
      return result.meta.changes
        ? json({ saved: true }, 201)
        : json({ error: 'This pilot supports 40 plans per mission.' }, 409);
    }
    if (!old) return json({ error: 'Plan not found.' }, 404);
    if (!access.owner)
      return json(
        { error: 'Only the mission lead can edit or decide shared plans.' },
        403,
      );
    if (old.status !== 'proposed' || d.revision !== old.revision)
      return json(
        { error: 'This plan changed or was already decided. Refresh first.' },
        409,
      );
    if (d.operation === 'edit') {
      if (!validPlan(d.body))
        return json({ error: 'Check task fields and dependencies.' }, 400);
      const result = await db
        .prepare(
          "UPDATE mission_plans SET body=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status='proposed'",
        )
        .bind(JSON.stringify(d.body), now, d.id, d.revision)
        .run();
      return result.meta.changes
        ? json({ saved: true })
        : json({ error: 'Plan changed. Refresh first.' }, 409);
    }
    if (
      !['approve', 'reject'].includes(d.operation) ||
      typeof d.feedback !== 'string' ||
      d.feedback.trim().length < 5 ||
      d.feedback.length > 2000
    )
      return json({ error: 'Include a short decision note.' }, 400);
    if (d.operation === 'reject') {
      const r = await db
        .prepare(
          "UPDATE mission_plans SET status='rejected',feedback=?,reviewer=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status='proposed'",
        )
        .bind(d.feedback, access.author, now, d.id, d.revision)
        .run();
      return r.meta.changes
        ? json({ saved: true })
        : json({ error: 'Plan changed. Refresh first.' }, 409);
    }
    const plan: WorkPlan = JSON.parse(old.body);
    if (!validPlan(plan)) return json({ error: 'Plan is invalid.' }, 400);
    const repo = await ensureRepository(d.mission),
      prior = await readCommit(repo.head);
    const mapping = Object.fromEntries(
      plan.tasks.map((t) => [t.key, crypto.randomUUID()]),
    );
    const files = {
      ...prior.files,
      'mission-plan.json': JSON.stringify(
        {
          id: old.id,
          plan,
          actionIds: mapping,
          approvedBy: access.author,
          decision: d.feedback,
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
      'Approve modular work plan',
      now,
      files,
    );
    const statements = [
      commit.statement,
      db
        .prepare(
          "UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND EXISTS(SELECT 1 FROM mission_plans WHERE id=? AND status='proposed' AND revision=?) AND (SELECT COUNT(*) FROM mission_actions WHERE mission=?)+?<=100",
        )
        .bind(
          commit.row.oid,
          d.mission,
          repo.head,
          d.id,
          d.revision,
          d.mission,
          plan.tasks.length,
        ),
      db
        .prepare(
          "UPDATE mission_plans SET status='approved',feedback=?,reviewer=?,head=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status='proposed' AND EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?)",
        )
        .bind(
          d.feedback,
          access.author,
          commit.row.oid,
          now,
          d.id,
          d.revision,
          d.mission,
          commit.row.oid,
        ),
    ];
    for (const task of plan.tasks) {
      const action = mapping[task.key],
        event = crypto.randomUUID(),
        brief = `${task.brief}\n\nInputs: ${task.inputs}\nOutputs: ${task.outputs}\nTools: ${task.tools.join(', ') || 'None specified'}`;
      statements.push(
        db
          .prepare(
            "INSERT INTO mission_actions(id,mission,creator_id,title,brief,done_when,kind,effort,status,revision,last_event,created_at,updated_at) SELECT ?,?,?,?,?,?,'Agent-assisted work','Flexible','open',1,?,?,? WHERE EXISTS(SELECT 1 FROM mission_plans WHERE id=? AND head=?)",
          )
          .bind(
            action,
            d.mission,
            access.id,
            task.title,
            brief,
            task.doneWhen,
            event,
            now,
            now,
            d.id,
            commit.row.oid,
          ),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO action_events(id,action_id,user_id,author,kind,body,url,revision,created_at) SELECT ?,id,?,?,'create',?,'',1,? FROM mission_actions WHERE id=?",
          )
          .bind(
            event,
            access.id,
            access.author,
            `Approved plan ${old.id}; module ${task.module}`,
            now,
            action,
          ),
      );
      statements.push(
        db
          .prepare(
            'INSERT INTO planned_tasks(action_id,plan_id,task_key,module,dependencies) SELECT id,?,?,?,? FROM mission_actions WHERE id=?',
          )
          .bind(
            d.id,
            task.key,
            task.module,
            JSON.stringify(task.dependsOn.map((k) => mapping[k])),
            action,
          ),
      );
    }
    const results = await db.batch(statements);
    return results[1].meta.changes
      ? json({ saved: true, head: commit.row.oid })
      : json(
          {
            error:
              'The mission changed or its task board is full. Refresh and retry.',
          },
          409,
        );
  } catch {
    return json({ error: 'Plan could not be saved.' }, 503);
  }
}
