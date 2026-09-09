import { database } from '@/db/client';
import { missions } from '@/lib/missions';
export type MissionRecord = {
  id: string;
  owner_id: string;
  title: string;
  category: string;
  description: string;
  outcome: string;
  roles: string;
  steps: string;
  intent: string;
  revision: number;
  created_at: string;
  updated_at: string;
};
export async function getMission(slug: string) {
  const seeded = missions.find((m) => m.slug === slug);
  if (seeded)
    return { ...seeded, ownerId: null, revision: 1, intent: 'community' };
  const row = await database()
    .prepare('SELECT * FROM community_missions WHERE id=?')
    .bind(slug)
    .first<MissionRecord>();
  if (!row) return null;
  return {
    slug: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    outcome: row.outcome,
    roles: JSON.parse(row.roles) as string[],
    steps: JSON.parse(row.steps) as string[],
    intent: row.intent,
    revision: row.revision,
    ownerId: row.owner_id,
    tag: 'Community mission · Revision ' + row.revision,
    note:
      row.intent === 'commercial'
        ? 'Commercial intent is declared. Contributor ownership and commercial terms must be agreed explicitly before formal work or financial commitments.'
        : 'Community mission with noncommercial intent. This pilot records interest; it does not establish ownership agreements, collect money, or confirm attendance.',
  };
}
