import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '';
    const access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const rows = await database()
      .prepare(
        'WITH recent AS (SELECT * FROM mission_posts WHERE mission=? ORDER BY created_at DESC LIMIT 200) SELECT id,author,kind,body,parent_id,created_at FROM mission_posts WHERE id IN (SELECT id FROM recent UNION SELECT parent_id FROM recent) ORDER BY created_at DESC',
      )
      .bind(mission)
      .all();
    return json({
      posts: rows.results,
      canPost: access.owner,
      canReply: access.canReply,
      signedIn: !!access.id,
    });
  } catch {
    return json({ error: 'Updates could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to take part.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Use a JSON request.' }, 415);
  try {
    const raw = await req.text();
    if (raw.length > 6500)
      return json({ error: 'Please keep your update short.' }, 413);
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (
      !d ||
      typeof d.mission !== 'string' ||
      typeof d.id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(d.id) ||
      typeof d.body !== 'string' ||
      d.body.trim().length < 3 ||
      d.body.trim().length > 4000 ||
      !['progress', 'question', 'next_step', 'reply'].includes(d.kind)
    )
      return json(
        { error: 'Choose a type and write 3–4,000 characters.' },
        400,
      );
    const access = await missionAccess(req, d.mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database();
    if (d.kind === 'reply') {
      if (!access.canReply)
        return json({ error: 'Join this mission before replying.' }, 403);
      if (
        typeof d.parentId !== 'string' ||
        !(await db
          .prepare(
            'SELECT id FROM mission_posts WHERE id=? AND mission=? AND parent_id IS NULL',
          )
          .bind(d.parentId, d.mission)
          .first())
      )
        return json(
          { error: 'The update you are replying to was not found.' },
          400,
        );
    } else if (!access.owner)
      return json(
        { error: 'Only the mission creator can publish updates.' },
        403,
      );
    const existing = await db
      .prepare('SELECT user_id,mission FROM mission_posts WHERE id=?')
      .bind(d.id)
      .first();
    if (existing)
      return existing.user_id === access.id && existing.mission === d.mission
        ? json({ saved: true })
        : json({ error: 'This post ID already exists.' }, 409);
    const r = await db
      .prepare(
        'INSERT OR IGNORE INTO mission_posts (id,mission,user_id,author,kind,body,parent_id,created_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM mission_posts WHERE user_id=? AND created_at>?)<30',
      )
      .bind(
        d.id,
        d.mission,
        access.id,
        access.author,
        d.kind,
        d.body.trim(),
        d.kind === 'reply' ? d.parentId : null,
        new Date().toISOString(),
        access.id,
        new Date(Date.now() - 86400000).toISOString(),
      )
      .run();
    if (!r.meta.changes)
      return json(
        { error: 'The pilot allows 30 posts per person per day.' },
        429,
      );
    return json({ saved: true }, 201);
  } catch {
    return json(
      { error: 'Could not save your post. Your draft is still here.' },
      503,
    );
  }
}
