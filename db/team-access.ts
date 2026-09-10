import { database } from '@/db/client';
import { moduleKey } from '@/lib/teams';
export async function leadScopes(mission: string, userId: string | null) {
  if (!userId) return [];
  const rows = await database()
    .prepare(
      'SELECT l.module FROM mission_leads l JOIN mission_members m ON m.id=l.member_id AND m.mission=l.mission WHERE l.mission=? AND m.user_id=? AND m.active=1',
    )
    .bind(mission, userId)
    .all<{ module: string }>();
  return rows.results.map((r) => r.module);
}
export const coversModules = (
  owner: boolean,
  scopes: string[],
  modules: string[],
) =>
  owner ||
  (modules.length > 0 && modules.every((m) => scopes.includes(moduleKey(m))));
// Recheck delegation in the same transaction as the write, including revocation.
// Parameters: owner flag, JSON module keys, mission, authenticated account ID.
export const scopeGuard =
  '(?=1 OR NOT EXISTS(SELECT 1 FROM json_each(?) scope WHERE NOT EXISTS(SELECT 1 FROM mission_leads l JOIN mission_members m ON m.id=l.member_id AND m.mission=l.mission WHERE l.module=scope.value AND l.mission=? AND m.user_id=? AND m.active=1)))';
