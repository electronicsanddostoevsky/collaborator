import { database, maintainerEmail } from '@/db/client';
import { getMission } from '@/db/missions';
export async function missionAccess(req: Request, slug: string) {
  const id = req.headers.get('oai-authenticated-user-email')
    ? req.headers.get('oai-authenticated-user-id')
    : null;
  const m = slug === 'mahabharata' ? { ownerId: null } : await getMission(slug);
  if (!m) return null;
  const owner =
    !!id &&
    (m.ownerId
      ? id === m.ownerId
      : !!maintainerEmail() &&
        req.headers.get('oai-authenticated-user-email')?.toLowerCase() ===
          maintainerEmail());
  let joined = false;
  if (id) {
    joined =
      slug === 'mahabharata'
        ? !!(await database()
            .prepare(
              'SELECT user_id FROM follows WHERE user_id=? UNION SELECT user_id FROM claims WHERE user_id=? UNION SELECT user_id FROM proposals WHERE user_id=? LIMIT 1',
            )
            .bind(id, id, id)
            .first())
        : !!(await database()
            .prepare(
              'SELECT id FROM participation WHERE mission=? AND user_id=?',
            )
            .bind(slug, id)
            .first());
  }
  let author =
    req.headers.get('oai-authenticated-user-full-name') || 'Contributor';
  if (
    req.headers.get('oai-authenticated-user-full-name-encoding') ===
    'percent-encoded-utf-8'
  ) {
    try {
      author = decodeURIComponent(author);
    } catch {
      author = 'Contributor';
    }
  }
  return { id, owner, canReply: owner || joined, author: author.slice(0, 100) };
}
