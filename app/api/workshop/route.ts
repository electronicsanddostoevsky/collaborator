import { database, bucket } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { boundedBody } from '@/lib/artifacts';
import { ensureRepository, readCommit, prepareCommit } from '@/db/mission-git';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
type Artifact = {
  id: string;
  mission: string;
  user_id: string;
  author: string;
  prompt: string;
  model: string;
  object_key: string;
  size: number;
  sha256: string;
  status: string;
  created_at: string;
  preview_key: string | null;
};
export async function GET(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to open the workshop.' }, 401);
  try {
    const q = new URL(req.url).searchParams,
      mission = q.get('mission') || 'mahabharata';
    const access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const id = q.get('id');
    if (id) {
      const item = await database()
        .prepare(
          "SELECT * FROM workshop_artifacts WHERE id=? AND mission=? AND status!='uploading'",
        )
        .bind(id, mission)
        .first<Artifact>();
      if (!item) return json({ error: 'Artifact not found.' }, 404);
      const preview = q.get('preview') === '1';
      if (preview && !item.preview_key)
        return json({ error: 'No preview was shared.' }, 404);
      const file = await bucket().get(
        preview ? item.preview_key! : item.object_key,
      );
      if (!file) return json({ error: 'File temporarily unavailable.' }, 503);
      return new Response(file.body, {
        headers: {
          'Content-Type': preview ? 'image/png' : 'application/octet-stream',
          'Content-Disposition':
            (preview
              ? 'inline; filename="preview-'
              : 'attachment; filename="workshop-') +
            item.id +
            (preview ? '.png"' : '.zip"'),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
          'Content-Security-Policy': "sandbox; default-src 'none'",
        },
      });
    }
    const rows = await database()
      .prepare(
        "SELECT id,author,prompt,model,size,sha256,status,created_at,feedback,reviewer,reviewed_at,(preview_key IS NOT NULL) AS hasPreview FROM workshop_artifacts WHERE mission=? AND status!='uploading' ORDER BY created_at DESC LIMIT 100",
      )
      .bind(mission)
      .all();
    return json({ artifacts: rows.results, canAccept: access.owner });
  } catch {
    return json({ error: 'Workshop results could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to share a result.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Origin not allowed.' }, 403);
  try {
    const q = new URL(req.url).searchParams,
      mission = q.get('mission') || 'mahabharata',
      id = q.get('id') || '';
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))
      return json({ error: 'Invalid run ID.' }, 400);
    const access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database();
    if (q.get('action') === 'preview') {
      const item = await db
        .prepare('SELECT * FROM workshop_artifacts WHERE id=? AND mission=?')
        .bind(id, mission)
        .first<Artifact>();
      if (!item || item.user_id !== access.id)
        return json(
          { error: 'Only the contributor can share this preview.' },
          403,
        );
      if (item.preview_key) return json({ saved: true });
      if (item.status !== 'shared')
        return json({ error: 'Previews must be shared before review.' }, 409);
      let bytes: Uint8Array;
      try {
        bytes = await boundedBody(req, 1048576);
      } catch {
        return json({ error: 'Preview must be a PNG under 1 MB.' }, 413);
      }
      if (![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
        return json({ error: 'Use a PNG preview.' }, 400);
      const key = 'workshop-previews/' + crypto.randomUUID();
      await bucket().put(key, bytes);
      try {
        const r = await db
          .prepare(
            "UPDATE workshop_artifacts SET preview_key=? WHERE id=? AND status='shared' AND preview_key IS NULL AND (SELECT COALESCE(SUM(size+CASE WHEN preview_key IS NOT NULL THEN 1048576 ELSE 0 END),0) FROM workshop_artifacts WHERE user_id=?)+1048576<=104857600",
          )
          .bind(key, id, access.id)
          .run();
        if (!r.meta.changes) {
          await bucket().delete(key);
          return json(
            {
              error:
                'Preview changed or storage allowance is full. Refresh to check.',
            },
            409,
          );
        }
      } catch (e) {
        await bucket().delete(key);
        throw e;
      }
      return json({ saved: true }, 201);
    }
    if (['accept', 'revise'].includes(q.get('action') || '')) {
      if (!access.owner)
        return json(
          { error: 'Only the mission maintainer can accept a result.' },
          403,
        );
      const item = await db
        .prepare('SELECT * FROM workshop_artifacts WHERE id=? AND mission=?')
        .bind(id, mission)
        .first<Artifact>();
      if (!item || item.status === 'uploading')
        return json({ error: 'Result not found.' }, 404);
      const decision =
        q.get('action') === 'accept' ? 'accepted' : 'changes_requested';
      if (item.status === decision) return json({ saved: true });
      if (item.status !== 'shared')
        return json(
          {
            error:
              'This review is already recorded. Share a new iteration for another review.',
          },
          409,
        );
      let review: { feedback?: unknown };
      try {
        review = JSON.parse(
          new TextDecoder().decode(await boundedBody(req, 8192)),
        );
      } catch {
        return json({ error: 'Add a review note.' }, 400);
      }
      if (
        typeof review.feedback !== 'string' ||
        review.feedback.trim().length < 5 ||
        review.feedback.length > 2000
      )
        return json(
          { error: 'Leave a review note between 5 and 2000 characters.' },
          400,
        );
      const feedback = review.feedback.trim(),
        reviewedAt = new Date().toISOString();
      if (decision === 'changes_requested') {
        const r = await db
          .prepare(
            "UPDATE workshop_artifacts SET status='changes_requested',feedback=?,reviewer=?,reviewed_at=? WHERE id=? AND status='shared'",
          )
          .bind(feedback, access.author, reviewedAt, id)
          .run();
        return r.meta.changes
          ? json({ saved: true })
          : json({ error: 'Review changed. Refresh.' }, 409);
      }
      const repo = await ensureRepository(mission),
        prior = await readCommit(repo.head);
      const files = {
        ...prior.files,
        ['workshop-' + id + '.json']: JSON.stringify(
          {
            artifact: id,
            sha256: item.sha256,
            prompt: item.prompt,
            model: item.model,
            review: { feedback, reviewer: access.author, reviewedAt },
            download:
              '/api/workshop?mission=' +
              encodeURIComponent(mission) +
              '&id=' +
              id,
          },
          null,
          2,
        ),
      };
      if (Object.keys(files).length > 13)
        return json(
          {
            error:
              'The pilot workspace is full. Remove a working file before accepting another result.',
          },
          409,
        );
      const commit = await prepareCommit(
        mission,
        JSON.parse(prior.blob),
        repo.head,
        access.author,
        'Accept workshop artifact ' + id.slice(0, 8),
        new Date().toISOString(),
        files,
      );
      const result = await db.batch([
        commit.statement,
        db
          .prepare(
            "UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND EXISTS(SELECT 1 FROM workshop_artifacts WHERE id=? AND status='shared')",
          )
          .bind(commit.row.oid, mission, repo.head, id),
        db
          .prepare(
            "UPDATE workshop_artifacts SET status='accepted',feedback=?,reviewer=?,reviewed_at=? WHERE id=? AND status='shared' AND EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?)",
          )
          .bind(
            feedback,
            access.author,
            reviewedAt,
            id,
            mission,
            commit.row.oid,
          ),
      ]);
      return result[1].meta.changes
        ? json({ saved: true })
        : json({ error: 'The mission changed. Refresh and retry.' }, 409);
    }
    const prompt = q.get('prompt') || '',
      model = q.get('model') || '';
    if (
      prompt.length < 10 ||
      prompt.length > 3000 ||
      !model ||
      model.length > 120
    )
      return json({ error: 'Missing run description or model.' }, 400);
    const previous = await db
      .prepare('SELECT * FROM workshop_artifacts WHERE id=?')
      .bind(id)
      .first<Artifact>();
    if (previous)
      return previous.user_id === access.id &&
        previous.mission === mission &&
        previous.status !== 'uploading'
        ? json({ saved: true })
        : json(
            { error: 'This upload is pending or its ID is already used.' },
            409,
          );
    let bytes: Uint8Array;
    try {
      bytes = await boundedBody(req, 10 * 1024 * 1024);
    } catch {
      return json({ error: 'Result must be between 1 byte and 10 MB.' }, 413);
    }
    if (bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4)
      return json({ error: 'Upload the workshop ZIP result.' }, 400);
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer),
      ),
    )
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const key = 'workshop/' + id;
    const reservation = await db
      .prepare(
        "INSERT INTO workshop_artifacts (id,mission,user_id,author,prompt,model,object_key,size,sha256,status,created_at) SELECT ?,?,?,?,?,?,?,?,?,'uploading',? WHERE (SELECT COALESCE(SUM(size+CASE WHEN preview_key IS NOT NULL THEN 1048576 ELSE 0 END),0) FROM workshop_artifacts WHERE user_id=?)+?<=104857600",
      )
      .bind(
        id,
        mission,
        access.id,
        access.author,
        prompt,
        model,
        key,
        bytes.length,
        hash,
        new Date().toISOString(),
        access.id,
        bytes.length,
      )
      .run();
    if (!reservation.meta.changes)
      return json(
        { error: 'Your workshop storage allowance is full (100 MB).' },
        409,
      );
    try {
      await bucket().put(key, bytes);
      await db
        .prepare("UPDATE workshop_artifacts SET status='shared' WHERE id=?")
        .bind(id)
        .run();
    } catch {
      await bucket().delete(key);
      await db
        .prepare(
          "DELETE FROM workshop_artifacts WHERE id=? AND status='uploading'",
        )
        .bind(id)
        .run();
      throw Error('Upload failed');
    }
    return json({ saved: true }, 201);
  } catch {
    return json(
      {
        error:
          'The result could not be saved. Your local files remain available.',
      },
      503,
    );
  }
}
