import { database } from '@/db/client';
import { missions } from '@/lib/missions';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  const mission = new URL(req.url).searchParams.get('mission');
  if (!missions.some((m) => m.slug === mission))
    return json({ error: 'Unknown mission.' }, 404);
  try {
    const db = database(),
      user = req.headers.get('oai-authenticated-user-id');
    const counts = await db
      .prepare(
        'SELECT role,COUNT(*) AS count FROM participation WHERE mission=? GROUP BY role',
      )
      .bind(mission)
      .all();
    const own = user
      ? await db
          .prepare(
            'SELECT role,note FROM participation WHERE mission=? AND user_id=?',
          )
          .bind(mission, user)
          .first()
      : null;
    return json({
      signedIn: !!user && !!req.headers.get('oai-authenticated-user-email'),
      counts: counts.results,
      own,
    });
  } catch {
    return json({ error: 'Participation could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  const user = req.headers.get('oai-authenticated-user-id');
  if (!user || !req.headers.get('oai-authenticated-user-email'))
    return json({ error: 'Sign in to express interest.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  try {
    if (!req.headers.get('content-type')?.startsWith('application/json'))
      return json({ error: 'Invalid request.' }, 415);
    const raw = await req.text();
    if (raw.length > 3000)
      return json({ error: 'Please keep your note short.' }, 413);
    const body = JSON.parse(raw);
    const m = missions.find((m) => m.slug === body.mission);
    if (!m) return json({ error: 'Unknown mission.' }, 400);
    const db = database();
    if (body.action === 'withdraw') {
      await db
        .prepare('DELETE FROM participation WHERE mission=? AND user_id=?')
        .bind(m.slug, user)
        .run();
    } else if (body.action === 'interest') {
      if (
        !m.roles.includes(body.role) ||
        typeof body.note !== 'string' ||
        body.note.length > 1000
      )
        return json(
          {
            error:
              'Choose a contribution and keep the note under 1,000 characters.',
          },
          400,
        );
      await db
        .prepare(
          'INSERT INTO participation (id,mission,user_id,role,note,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(mission,user_id) DO UPDATE SET role=excluded.role,note=excluded.note,updated_at=excluded.updated_at',
        )
        .bind(
          crypto.randomUUID(),
          m.slug,
          user,
          body.role,
          body.note.trim(),
          new Date().toISOString(),
        )
        .run();
    } else return json({ error: 'Unknown action.' }, 400);
    return json({ saved: true });
  } catch {
    return json(
      { error: 'Your interest could not be saved. Please retry.' },
      503,
    );
  }
}
