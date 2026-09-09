import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database();
    const result =
      mission === 'mahabharata'
        ? await db
            .prepare(
              'SELECT COUNT(*) AS count,COALESCE(MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END),0) AS following FROM follows',
            )
            .bind(access.id || '')
            .first()
        : await db
            .prepare(
              'SELECT COUNT(*) AS count,COALESCE(MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END),0) AS following FROM mission_follows WHERE mission=?',
            )
            .bind(access.id || '', mission)
            .first();
    return json({
      count: result?.count || 0,
      following: !!result?.following,
      signedIn: !!access.id,
    });
  } catch {
    return json({ error: 'Follow status could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to follow a mission.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Use a JSON request.' }, 415);
  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: 'Request is too long.' }, 413);
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (!d || typeof d.mission !== 'string' || typeof d.following !== 'boolean')
      return json({ error: 'Choose a mission and follow preference.' }, 400);
    const access = await missionAccess(req, d.mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database();
    if (d.mission === 'mahabharata') {
      if (d.following)
        await db
          .prepare(
            'INSERT OR IGNORE INTO follows (user_id,created_at) VALUES (?,?)',
          )
          .bind(access.id, new Date().toISOString())
          .run();
      else
        await db
          .prepare('DELETE FROM follows WHERE user_id=?')
          .bind(access.id)
          .run();
    } else {
      if (d.following)
        await db
          .prepare(
            'INSERT OR IGNORE INTO mission_follows (id,mission,user_id,created_at) VALUES (?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            d.mission,
            access.id,
            new Date().toISOString(),
          )
          .run();
      else
        await db
          .prepare('DELETE FROM mission_follows WHERE mission=? AND user_id=?')
          .bind(d.mission, access.id)
          .run();
    }
    return json({ saved: true });
  } catch {
    return json(
      { error: 'Could not update your follow preference. Try again.' },
      503,
    );
  }
}
