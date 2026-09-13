import { database } from '@/db/client';
import { missions } from '@/lib/missions';
import { categories } from '@/lib/mission-input';
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const search = (q.get('q') || '').trim().slice(0, 100),
      category = q.get('category') || '';
    if (category && !categories.includes(category))
      return json({ error: 'Unknown category.' }, 400);
    let cursor: { date: string; id: string } | null = null;
    if (q.has('cursor')) {
      try {
        cursor = JSON.parse(q.get('cursor')!);
        if (
          !cursor ||
          typeof cursor.date !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}T/.test(cursor.date) ||
          cursor.date.length > 30 ||
          typeof cursor.id !== 'string' ||
          !/^[a-z0-9-]{1,80}$/.test(cursor.id)
        )
          throw Error();
      } catch {
        return json({ error: 'Refresh the feed to continue.' }, 400);
      }
    }
    const seeds = [
      {
        slug: 'mahabharata',
        title: 'Make the epic playable.',
        category: 'Creative worlds',
        description:
          'A community-built Mahabharata game. Bring lore, creative direction, or your agent to help build the first playable scene.',
      },
      ...missions,
    ];
    const values: (string | number)[] = [];
    const seedSQL = seeds
      .map((m) => {
        values.push(m.slug, m.title, m.category, m.description);
        return "SELECT ? id,? title,? category,? description,'community' intent,'2000-01-01T00:00:00.000Z' created_at,1 example";
      })
      .join(' UNION ALL ');
    let where = '1=1';
    if (category) {
      where += ' AND m.category=?';
      values.push(category);
    }
    if (search) {
      where += " AND (m.title||' '||m.description) LIKE ? ESCAPE '\\'";
      values.push('%' + search.replace(/[\\%_]/g, '\\$&') + '%');
    }
    if (cursor) {
      where += ' AND (m.created_at<? OR (m.created_at=? AND m.id<?))';
      values.push(cursor.date, cursor.date, cursor.id);
    }
    const rows = (
      await database()
        .prepare(`WITH feed AS (
      SELECT id,title,category,description,intent,created_at,0 example FROM community_missions UNION ALL ${seedSQL}
    ) SELECT m.*,
      (SELECT COUNT(*) FROM mission_members WHERE mission=m.id AND active=1) members,
      (SELECT COUNT(*) FROM mission_actions WHERE mission=m.id AND status='open') open_tasks,
      (SELECT COUNT(*) FROM mission_actions WHERE mission=m.id AND status='done') completed_tasks
      FROM feed m WHERE ${where} ORDER BY m.created_at DESC,m.id DESC LIMIT 16`)
        .bind(...values)
        .all<{ id: string; created_at: string }>()
    ).results;
    const page = rows.slice(0, 15),
      last = page.at(-1);
    return json({
      missions: page,
      nextCursor:
        rows.length > 15 && last
          ? JSON.stringify({ date: last.created_at, id: last.id })
          : null,
    });
  } catch {
    return json(
      {
        error:
          'The feed could not be loaded. Your missions are still saved. Try again.',
      },
      503,
    );
  }
}
