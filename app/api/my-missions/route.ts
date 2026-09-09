import { database, maintainerEmail } from '@/db/client';
import { missions } from '@/lib/missions';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  const user = req.headers.get('oai-authenticated-user-id');
  const email = req.headers.get('oai-authenticated-user-email');
  if (!user || !email)
    return json({ error: 'Sign in to see your missions.' }, 401);
  try {
    const db = database();
    const rows = await db
      .prepare(
        'SELECT m.id,m.title,m.category,m.description,m.owner_id,p.role FROM community_missions m LEFT JOIN participation p ON p.mission=m.id AND p.user_id=? WHERE m.owner_id=? OR p.user_id=? ORDER BY m.updated_at DESC LIMIT 200',
      )
      .bind(user, user, user)
      .all<{
        id: string;
        title: string;
        category: string;
        description: string;
        owner_id: string;
        role: string | null;
      }>();
    const items = rows.results.map(({ owner_id, ...m }) => ({
      ...m,
      slug: m.id,
      href: '/missions/' + m.id,
      created: owner_id === user,
      joined: !!m.role,
      following: false,
    }));
    for (const m of missions) {
      const interest = await db
        .prepare('SELECT role FROM participation WHERE mission=? AND user_id=?')
        .bind(m.slug, user)
        .first<{ role: string }>();
      if (interest)
        items.push({
          id: m.slug,
          slug: m.slug,
          href: '/missions/' + m.slug,
          title: m.title,
          category: m.category,
          description: m.description,
          role: interest.role,
          created: false,
          joined: true,
          following: false,
        });
    }
    const own = await db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM follows WHERE user_id=?) AS following,(SELECT COUNT(*) FROM claims WHERE user_id=?) AS claimed,(SELECT COUNT(*) FROM proposals WHERE user_id=?) AS contributed',
      )
      .bind(user, user, user)
      .first<{ following: number; claimed: number; contributed: number }>();
    const maintainer =
      !!maintainerEmail() && email.toLowerCase() === maintainerEmail();
    if (
      own &&
      (own.following || own.claimed || own.contributed || maintainer)
    ) {
      items.push({
        id: 'mahabharata',
        slug: 'mahabharata',
        href: '/mahabharata',
        title: 'Make the epic playable.',
        category: 'Creative worlds',
        description: 'The shared Mahabharata game mission.',
        role: own.claimed
          ? 'You have a claimed task'
          : maintainer
            ? 'Mission maintainer'
            : '',
        created: false,
        joined: !!(own.claimed || own.contributed),
        following: !!own.following,
      });
    }
    const latestRows: {
      results: {
        mission: string;
        body: string;
        kind: string;
        created_at: string;
      }[];
    } = { results: [] };
    for (let offset = 0; offset < items.length; offset += 80) {
      const chunk = items.slice(offset, offset + 80);
      const rows = await db
        .prepare(
          `SELECT mission,body,kind,created_at FROM (SELECT mission,body,kind,created_at,ROW_NUMBER() OVER (PARTITION BY mission ORDER BY created_at DESC,id DESC) AS rank FROM mission_posts WHERE parent_id IS NULL AND mission IN (${chunk.map(() => '?').join(',')})) WHERE rank=1`,
        )
        .bind(...chunk.map((m) => m.slug))
        .all<{
          mission: string;
          body: string;
          kind: string;
          created_at: string;
        }>();
      latestRows.results.push(...rows.results);
    }
    const enriched = items.map((m) => ({
      ...m,
      latest: latestRows.results.find((p) => p.mission === m.slug) || null,
    }));
    const pending = maintainer
      ? await db
          .prepare(
            "SELECT COUNT(*) AS count FROM proposals WHERE status='pending'",
          )
          .first<{ count: number }>()
      : null;
    return json({ missions: enriched, pendingReviews: pending?.count || 0 });
  } catch {
    return json({ error: 'Your missions could not be loaded.' }, 503);
  }
}
