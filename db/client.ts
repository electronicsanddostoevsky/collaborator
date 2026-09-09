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

export function bucket() {
  const store = (env as unknown as { ARTIFACTS?: R2Bucket }).ARTIFACTS;
  if (!store) throw new Error('Artifact storage is not configured');
  return store;
}
