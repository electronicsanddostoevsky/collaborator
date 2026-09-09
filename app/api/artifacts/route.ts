import { database, bucket } from '@/db/client';
import {
  MAX_UPLOAD_BYTES,
  USER_STORAGE_BYTES,
  safeFilename,
  supportedFile,
  boundedBody,
} from '@/lib/artifacts';
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(req: Request) {
  const user = req.headers.get('oai-authenticated-user-id');
  if (!user || !req.headers.get('oai-authenticated-user-email'))
    return json({ error: 'Sign in to upload.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  const url = new URL(req.url),
    taskId = url.searchParams.get('taskId') || '',
    filename = safeFilename(url.searchParams.get('filename') || '');
  if (
    !['lore', 'direction', 'mechanic'].includes(taskId) ||
    !supportedFile(filename)
  )
    return json({ error: 'Choose a supported file and task.' }, 400);
  if (Number(req.headers.get('content-length')) > MAX_UPLOAD_BYTES)
    return json({ error: 'Files must be 10 MB or smaller.' }, 413);
  try {
    const db = database();
    const claim = await db
      .prepare('SELECT user_id FROM claims WHERE task_id=?')
      .bind(taskId)
      .first();
    if (claim?.user_id !== user)
      return json({ error: 'Claim the task before uploading.' }, 409);
    let bytes: Uint8Array;
    try {
      bytes = await boundedBody(req, MAX_UPLOAD_BYTES);
    } catch {
      return json({ error: 'Upload is empty or exceeds 10 MB.' }, 413);
    }
    if (!bytes.length) return json({ error: 'Choose a nonempty file.' }, 400);
    const sha256 = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer),
      ),
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const id = crypto.randomUUID(),
      key = 'artifacts/' + id;
    const reserved = await db
      .prepare(
        'INSERT INTO artifacts (id,user_id,task_id,filename,size,sha256,object_key,ready,created_at) SELECT ?,?,?,?,?,?,?,0,? WHERE (SELECT COALESCE(SUM(size),0) FROM artifacts WHERE user_id=?) + ? <= ?',
      )
      .bind(
        id,
        user,
        taskId,
        filename,
        bytes.length,
        sha256,
        key,
        new Date().toISOString(),
        user,
        bytes.length,
        USER_STORAGE_BYTES,
      )
      .run();
    if (!reserved.meta.changes)
      return json(
        { error: 'The pilot storage limit is 100 MB per contributor.' },
        409,
      );
    try {
      await bucket().put(key, bytes, {
        httpMetadata: { contentType: 'application/octet-stream' },
      });
      await db
        .prepare('UPDATE artifacts SET ready=1 WHERE id=?')
        .bind(id)
        .run();
    } catch {
      await bucket().delete(key);
      await db
        .prepare('DELETE FROM artifacts WHERE id=? AND ready=0')
        .bind(id)
        .run();
      throw Error('storage');
    }
    return json({ id, filename, size: bytes.length, sha256 });
  } catch {
    return json({ error: 'The file could not be saved. Please retry.' }, 503);
  }
}
export async function GET(req: Request) {
  const user = req.headers.get('oai-authenticated-user-id');
  if (!user || !req.headers.get('oai-authenticated-user-email'))
    return json({ error: 'Sign in to download.' }, 401);
  try {
    const id = new URL(req.url).searchParams.get('id') || '';
    const row = await database()
      .prepare(
        'SELECT * FROM artifacts WHERE id=? AND ready=1 AND (user_id=? OR EXISTS (SELECT 1 FROM proposals WHERE artifact_id=artifacts.id))',
      )
      .bind(id, user)
      .first<{ filename: string; object_key: string; sha256: string }>();
    if (!row) return json({ error: 'Artifact not found.' }, 404);
    const file = await bucket().get(row.object_key);
    if (!file)
      return json(
        { error: 'Artifact storage is temporarily unavailable.' },
        503,
      );
    return new Response(file.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename(row.filename)}"`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'Cache-Control': 'private, no-store',
        'X-Artifact-SHA256': row.sha256,
      },
    });
  } catch {
    return json({ error: 'The artifact could not be downloaded.' }, 503);
  }
}
