export const actionKinds = [
  'Time & practical help',
  'Creative direction',
  'Research & expertise',
  'Materials & resources',
  'Agent-assisted work',
];
export const actionEfforts = [
  'Under 30 minutes',
  'About an hour',
  'A few hours',
  'Several sessions',
  'Flexible',
];
export type ActionRecord = {
  review_artifact?: string | null;
  canReview?: boolean;
  module?: string | null;
  blocked?: number;
  id: string;
  mission: string;
  title: string;
  brief: string;
  done_when: string;
  kind: string;
  effort: string;
  status: string;
  assignee_name: string | null;
  revision: number;
  mine: boolean;
  updated_at: string;
};
export type ActionEvent = {
  id: string;
  author: string;
  kind: string;
  body: string;
  url: string;
  revision: number;
  created_at: string;
};
export function actionLink(value: unknown): string | null {
  if (value === '' || value === undefined) return '';
  if (typeof value !== 'string' || value.length > 1500) return null;
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
