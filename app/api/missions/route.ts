import { database } from '@/db/client';
import { validateMission } from '@/lib/mission-input';
import type { MissionRecord } from '@/db/missions';
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
      const r = await db
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
        )
        .run();
      if (!r.meta.changes)
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
      const result = await db
        .prepare(
          'UPDATE community_missions SET title=?,category=?,description=?,outcome=?,roles=?,steps=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?',
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
        )
        .run();
      if (!result.meta.changes)
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
