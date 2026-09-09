import { env } from 'cloudflare:workers';
export function database() {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) throw new Error('Database is not configured');
  return db;
}
export function maintainerEmail() {
  return (
    (env as unknown as { MAINTAINER_EMAIL?: string }).MAINTAINER_EMAIL || ''
  )
    .trim()
    .toLowerCase();
}
