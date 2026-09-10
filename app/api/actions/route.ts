import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { actionKinds, actionEfforts, actionLink } from '@/lib/actions';
type Row = {
  id: string;
  mission: string;
  creator_id: string;
  title: string;
  brief: string;
  done_when: string;
  kind: string;
  effort: string;
  status: string;
  assignee_id: string | null;
  assignee_name: string | null;
  revision: number;
  last_event: string;
  created_at: string;
  updated_at: string;
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(req: Request) {
  try {
    const query = new URL(req.url).searchParams,
      mission = query.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access)
      return json({ error: 'Use this mission’s contribution workspace.' }, 404);
    const db = database();
    const rows = await db
      .prepare(
        "SELECT a.*,p.module,(SELECT COUNT(*) FROM json_each(p.dependencies) dep LEFT JOIN mission_actions required ON required.id=dep.value WHERE required.id IS NULL OR required.status!='done') blocked FROM mission_actions a LEFT JOIN planned_tasks p ON p.action_id=a.id WHERE a.mission=? ORDER BY a.created_at DESC,a.id DESC LIMIT 100",
      )
      .bind(mission)
      .all<Row>();
    const actions = rows.results.map(
      ({ creator_id, assignee_id, last_event, ...a }) => ({
        ...a,
        mine: !!access.id && assignee_id === access.id,
      }),
    );
    const action = query.get('action');
    let events: unknown[] = [];
    if (action) {
      if (!actions.some((a) => a.id === action))
        return json({ error: 'Action not found.' }, 404);
      events = (
        await db
          .prepare(
            'SELECT id,author,kind,body,url,revision,created_at FROM action_events WHERE action_id=? ORDER BY revision DESC LIMIT 100',
          )
          .bind(action)
          .all()
      ).results;
    }
    return json({
      actions,
      events,
      canManage: access.owner,
      signedIn: !!access.id,
    });
  } catch {
    return json({ error: 'Actions could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to take an action.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Use a JSON request.' }, 415);
  try {
    const raw = await req.text();
    if (raw.length > 14000)
      return json({ error: 'Please keep this action short.' }, 413);
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (!d || !uuid(d.id) || !uuid(d.eventId) || typeof d.mission !== 'string')
      return json({ error: 'Invalid action.' }, 400);
    const access = await missionAccess(req, d.mission);
    if (!access)
      return json({ error: 'Mission not found.' }, 404);
    const db = database(),
      now = new Date().toISOString();
    const existing = await db
      .prepare(
        'SELECT e.user_id,e.action_id,e.kind,a.mission FROM action_events e JOIN mission_actions a ON a.id=e.action_id WHERE e.id=?',
      )
      .bind(d.eventId)
      .first<{
        user_id: string;
        action_id: string;
        kind: string;
        mission: string;
      }>();
    if (existing)
      return existing.user_id === access.id &&
        existing.action_id === d.id &&
        existing.mission === d.mission &&
        existing.kind === d.operation
        ? json({ saved: true })
        : json({ error: 'This request ID is already used.' }, 409);
    if (d.operation === 'create') {
      if (!access.owner)
        return json(
          { error: 'Only the mission creator can add actions.' },
          403,
        );
      if (
        typeof d.title !== 'string' ||
        d.title.trim().length < 5 ||
        d.title.length > 120 ||
        typeof d.brief !== 'string' ||
        d.brief.trim().length < 10 ||
        d.brief.length > 2000 ||
        typeof d.doneWhen !== 'string' ||
        d.doneWhen.trim().length < 10 ||
        d.doneWhen.length > 1000 ||
        !actionKinds.includes(d.kind) ||
        !actionEfforts.includes(d.effort)
      )
        return json(
          {
            error:
              'Add a title, a short brief, and a clear description of done.',
          },
          400,
        );
      if (
        await db
          .prepare('SELECT id FROM mission_actions WHERE id=?')
          .bind(d.id)
          .first()
      )
        return json({ error: 'This action already exists.' }, 409);
      const results = await db.batch([
        db
          .prepare(
            "INSERT INTO mission_actions (id,mission,creator_id,title,brief,done_when,kind,effort,status,revision,last_event,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,'open',1,?,?,? WHERE (SELECT COUNT(*) FROM mission_actions WHERE mission=?)<100",
          )
          .bind(
            d.id,
            d.mission,
            access.id,
            d.title.trim(),
            d.brief.trim(),
            d.doneWhen.trim(),
            d.kind,
            d.effort,
            d.eventId,
            now,
            now,
            d.mission,
          ),
        db
          .prepare(
            "INSERT INTO action_events (id,action_id,user_id,author,kind,body,url,revision,created_at) SELECT ?,id,?,?,'create',?,'',1,? FROM mission_actions WHERE id=? AND last_event=?",
          )
          .bind(
            d.eventId,
            access.id,
            access.author,
            d.brief.trim(),
            now,
            d.id,
            d.eventId,
          ),
      ]);
      if (!results[0].meta.changes)
        return json(
          { error: 'This pilot supports 100 actions per mission.' },
          409,
        );
      return json({ saved: true }, 201);
    }
    const a = await db
      .prepare('SELECT * FROM mission_actions WHERE id=? AND mission=?')
      .bind(d.id, d.mission)
      .first<Row>();
    if (!a) return json({ error: 'Action not found.' }, 404);
    if (!Number.isInteger(d.revision) || a.revision !== d.revision)
      return json(
        { error: 'This action changed. Refresh before trying again.' },
        409,
      );
    let status = a.status,
      assignee = a.assignee_id,
      name = a.assignee_name;
    const body = typeof d.body === 'string' ? d.body.trim() : '';
    const url = actionLink(d.url);
    if (body.length > 4000 || url === null)
      return json(
        {
          error:
            'Use up to 4,000 characters and an optional http or https link.',
        },
        400,
      );
    switch (d.operation) {
      case 'claim':
        if (await db.prepare("SELECT p.action_id FROM planned_tasks p, json_each(p.dependencies) dep LEFT JOIN mission_actions required ON required.id=dep.value WHERE p.action_id=? AND (required.id IS NULL OR required.status!='done') LIMIT 1").bind(a.id).first())
          return json({error:'This task depends on work that has not been accepted yet.'},409);
        if (a.status !== 'open')
          return json({ error: 'Someone has already taken this action.' }, 409);
        status = 'doing';
        assignee = access.id;
        name = access.author;
        break;
      case 'release':
        if (a.assignee_id !== access.id)
          return json(
            { error: 'Only the person doing this can release it.' },
            403,
          );
        if (a.status !== 'doing')
          return json(
            { error: 'This action cannot be released in its current state.' },
            409,
          );
        status = 'open';
        assignee = null;
        name = null;
        break;
      case 'submit':
        if (a.assignee_id !== access.id)
          return json(
            { error: 'Only the person doing this can submit a result.' },
            403,
          );
        if (a.status !== 'doing')
          return json({ error: 'This action is not in progress.' }, 409);
        if (body.length < 10)
          return json(
            { error: 'Describe what happened in at least 10 characters.' },
            400,
          );
        status = 'review';
        break;
      case 'accept':
      case 'revise':
        if (!access.owner)
          return json(
            { error: 'Only the mission creator can review this result.' },
            403,
          );
        if (a.status !== 'review')
          return json(
            { error: 'This result has already been reviewed or is not ready.' },
            409,
          );
        if (body.length < 10)
          return json(
            {
              error:
                'Leave a short review so everyone understands the decision.',
            },
            400,
          );
        status = d.operation === 'accept' ? 'done' : 'doing';
        break;
      default:
        return json({ error: 'Unknown action.' }, 400);
    }
    const result = await db.batch([
      db
        .prepare(
          'UPDATE mission_actions SET status=?,assignee_id=?,assignee_name=?,revision=revision+1,last_event=?,updated_at=? WHERE id=? AND mission=? AND revision=?',
        )
        .bind(
          status,
          assignee,
          name,
          d.eventId,
          now,
          a.id,
          d.mission,
          a.revision,
        ),
      db
        .prepare(
          'INSERT INTO action_events (id,action_id,user_id,author,kind,body,url,revision,created_at) SELECT ?,id,?,?,?,?,?,revision,? FROM mission_actions WHERE id=? AND last_event=?',
        )
        .bind(
          d.eventId,
          access.id,
          access.author,
          d.operation,
          body,
          url,
          now,
          a.id,
          d.eventId,
        ),
    ]);
    if (!result[0].meta.changes)
      return json(
        { error: 'Someone changed this action. Refresh and try again.' },
        409,
      );
    return json({ saved: true });
  } catch {
    return json(
      { error: 'Could not save. Your draft is still here; retry safely.' },
      503,
    );
  }
}
