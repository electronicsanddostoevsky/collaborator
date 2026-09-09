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
    const maintainer =
      !!maintainerEmail() && email.toLowerCase() === maintainerEmail();
    const rows = await db
      .prepare(
        'SELECT m.id,m.title,m.category,m.description,m.owner_id,p.role,f.id AS follow_id,EXISTS(SELECT 1 FROM mission_actions a WHERE a.mission=m.id AND a.assignee_id=?) AS action_joined FROM community_missions m LEFT JOIN participation p ON p.mission=m.id AND p.user_id=? LEFT JOIN mission_follows f ON f.mission=m.id AND f.user_id=? WHERE m.owner_id=? OR p.user_id=? OR f.id IS NOT NULL OR EXISTS(SELECT 1 FROM mission_actions a WHERE a.mission=m.id AND a.assignee_id=?) ORDER BY m.updated_at DESC LIMIT 200',
      )
      .bind(user, user, user, user, user, user)
      .all<{
        id: string;
        title: string;
        category: string;
        description: string;
        owner_id: string;
        role: string | null;
        action_joined: number;
        follow_id: string | null;
      }>();
    const items = rows.results.map(
      ({ owner_id, action_joined, follow_id, ...m }) => ({
        ...m,
        slug: m.id,
        href: '/missions/' + m.id,
        created: owner_id === user,
        joined: !!m.role || !!action_joined,
        following: !!follow_id,
      }),
    );
    for (const m of missions) {
      const interest = await db
        .prepare('SELECT role FROM participation WHERE mission=? AND user_id=?')
        .bind(m.slug, user)
        .first<{ role: string }>();
      const actionJoined = !!(await db
        .prepare(
          'SELECT id FROM mission_actions WHERE mission=? AND assignee_id=? LIMIT 1',
        )
        .bind(m.slug, user)
        .first());
      const followed = !!(await db
        .prepare('SELECT id FROM mission_follows WHERE mission=? AND user_id=?')
        .bind(m.slug, user)
        .first());
      if (interest || actionJoined || maintainer || followed)
        items.push({
          id: m.slug,
          slug: m.slug,
          href: '/missions/' + m.slug,
          title: m.title,
          category: m.category,
          description: m.description,
          role:
            interest?.role ||
            (maintainer
              ? 'Mission maintainer'
              : actionJoined
                ? 'Contributing through an action'
                : ''),
          created: false,
          joined: !!interest || actionJoined,
          following: followed,
        });
    }
    const own = await db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM follows WHERE user_id=?) AS following,(SELECT COUNT(*) FROM claims WHERE user_id=?) AS claimed,(SELECT COUNT(*) FROM proposals WHERE user_id=?) AS contributed',
      )
      .bind(user, user, user)
      .first<{ following: number; claimed: number; contributed: number }>();
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
    const actionCounts = await db
      .prepare(
        "SELECT mission,SUM(CASE WHEN assignee_id=? AND status IN ('doing','review') THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN status='review' THEN 1 ELSE 0 END) AS reviews FROM mission_actions GROUP BY mission",
      )
      .bind(user)
      .all<{ mission: string; active: number; reviews: number }>();
    const enriched = items.map((m) => ({
      ...m,
      latest: latestRows.results.find((p) => p.mission === m.slug) || null,
      activeActions:
        actionCounts.results.find((a) => a.mission === m.slug)?.active || 0,
      pendingActions:
        m.created || (maintainer && missions.some((s) => s.slug === m.slug))
          ? actionCounts.results.find((a) => a.mission === m.slug)?.reviews || 0
          : 0,
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
