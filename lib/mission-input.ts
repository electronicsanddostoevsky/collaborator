export const categories = [
  'Creative worlds',
  'Local action',
  'Playful invention',
  'Community & movements',
  'Company & enterprise',
  'Research & learning',
];
export type MissionInput = {
  title: string;
  category: string;
  description: string;
  outcome: string;
  roles: string[];
  steps: string[];
  intent: string;
};
export function validateMission(input: unknown): MissionInput | null {
  if (!input || typeof input !== 'object') return null;
  const d = input as Record<string, unknown>;
  for (const [key, min, max] of [
    ['title', 5, 100],
    ['description', 20, 400],
    ['outcome', 20, 2000],
  ] as const) {
    if (
      typeof d[key] !== 'string' ||
      d[key].trim().length < min ||
      d[key].trim().length > max
    )
      return null;
  }
  if (
    !categories.includes(String(d.category)) ||
    !['community', 'commercial'].includes(String(d.intent))
  )
    return null;
  for (const key of ['roles', 'steps']) {
    const list = d[key];
    if (
      !Array.isArray(list) ||
      list.length < 1 ||
      list.length > 6 ||
      list.some(
        (x) => typeof x !== 'string' || !x.trim() || x.trim().length > 120,
      ) ||
      new Set(list.map((x) => x.trim())).size !== list.length
    )
      return null;
  }
  return {
    title: (d.title as string).trim(),
    description: (d.description as string).trim(),
    outcome: (d.outcome as string).trim(),
    category: d.category as string,
    intent: d.intent as string,
    roles: (d.roles as string[]).map((x) => x.trim()),
    steps: (d.steps as string[]).map((x) => x.trim()),
  };
}
