import { database, maintainerEmail } from '@/db/client';
const taskIds = ['lore', 'direction', 'mechanic'];
function identity(req: Request) {
  const id = req.headers.get('oai-authenticated-user-id');
  const email = req.headers.get('oai-authenticated-user-email');
  if (!id || !email) return null;
  let name =
    req.headers.get('oai-authenticated-user-full-name') || 'Contributor';
  if (
    req.headers.get('oai-authenticated-user-full-name-encoding') ===
    'percent-encoded-utf-8'
  ) {
    try {
      name = decodeURIComponent(name);
    } catch {
      name = 'Contributor';
    }
  }
  return {
    id,
    name: name.slice(0, 100),
    isMaintainer:
      !!maintainerEmail() && email.toLowerCase() === maintainerEmail(),
  };
}
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
async function snapshot(req: Request) {
  const user = identity(req);
  const db = database();
  const result = await db.batch<Record<string, unknown>>([
    db.prepare('SELECT task_id,name,user_id,created_at FROM claims'),
    db.prepare(
      'SELECT p.id,p.task_id,p.user_id,p.name,p.title,p.body,p.url,p.status,p.feedback,p.created_at,p.reviewed_at,p.revision,p.artifact_id,p.parent_id,a.filename,a.size,a.sha256 FROM proposals p LEFT JOIN artifacts a ON a.id=p.artifact_id ORDER BY p.created_at DESC LIMIT 100',
    ),
    db.prepare('SELECT COUNT(*) AS count FROM follows'),
    db
      .prepare('SELECT user_id FROM follows WHERE user_id = ?')
      .bind(user?.id || ''),
  ]);
  return {
    user: user ? { name: user.name, isMaintainer: user.isMaintainer } : null,
    maintainerConfigured: !!maintainerEmail(),
    claims: result[0].results.map((r) => ({
      taskId: r.task_id,
      name: r.name,
      mine: r.user_id === user?.id,
    })),
    proposals: result[1].results.map(({ user_id, ...r }) => ({
      ...r,
      mine: user_id === user?.id,
    })),
    supporters: result[2].results[0].count,
    following: result[3].results.length > 0,
  };
}
export async function GET(req: Request) {
  try {
    return json(await snapshot(req));
  } catch {
    return json(
      {
        error:
          'The collaboration workspace could not be loaded. Please try again.',
      },
      503,
    );
  }
}
export async function POST(req: Request) {
  try {
    const user = identity(req);
    if (!user) return json({ error: 'Sign in to contribute.' }, 401);
    const origin = req.headers.get('origin');
    if (!origin || origin !== new URL(req.url).origin)
      return json({ error: 'Request origin is not allowed.' }, 403);
    if (!req.headers.get('content-type')?.startsWith('application/json'))
      return json({ error: 'Use a JSON request.' }, 415);
    const raw = await req.text();
    if (raw.length > 16000)
      return json({ error: 'Contribution is too large.' }, 413);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (!data || typeof data !== 'object')
      return json({ error: 'Invalid request.' }, 400);
    const db = database(),
      now = new Date().toISOString();
    if (data.action === 'follow') {
      if (typeof data.following !== 'boolean')
        return json({ error: 'Choose whether to follow.' }, 400);
      await (
        data.following
          ? db
              .prepare(
                'INSERT OR IGNORE INTO follows (user_id,created_at) VALUES (?,?)',
              )
              .bind(user.id, now)
          : db.prepare('DELETE FROM follows WHERE user_id=?').bind(user.id)
      ).run();
    } else if (data.action === 'claim' || data.action === 'release') {
      if (!taskIds.includes(data.taskId))
        return json({ error: 'Unknown task.' }, 400);
      if (data.action === 'claim') {
        await db
          .prepare(
            'INSERT OR IGNORE INTO claims (task_id,user_id,name,created_at) VALUES (?,?,?,?)',
          )
          .bind(data.taskId, user.id, user.name, now)
          .run();
        const claim = await db
          .prepare('SELECT user_id FROM claims WHERE task_id=?')
          .bind(data.taskId)
          .first();
        if (claim?.user_id !== user.id)
          return json({ error: 'Someone else has claimed this task.' }, 409);
      } else {
        await db
          .prepare('DELETE FROM claims WHERE task_id=? AND user_id=?')
          .bind(data.taskId, user.id)
          .run();
      }
    } else if (data.action === 'submit') {
      if (
        !taskIds.includes(data.taskId) ||
        typeof data.title !== 'string' ||
        typeof data.body !== 'string' ||
        typeof data.url !== 'string' ||
        typeof data.id !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(data.id)
      )
        return json({ error: 'Invalid submission.' }, 400);
      if (
        (data.artifactId != null && typeof data.artifactId !== 'string') ||
        (data.parentId != null && typeof data.parentId !== 'string')
      )
        return json({ error: 'Invalid artifact or parent revision.' }, 400);
      const title = data.title.trim(),
        body = data.body.trim(),
        url = data.url.trim();
      if (
        title.length < 3 ||
        title.length > 120 ||
        body.length < 20 ||
        body.length > 10000 ||
        url.length > 2000
      )
        return json(
          {
            error:
              'Use a title of 3–120 characters and a contribution of 20–10,000 characters.',
          },
          400,
        );
      if (url) {
        try {
          if (new URL(url).protocol !== 'https:') throw Error();
        } catch {
          return json(
            { error: 'Artifact links must be valid HTTPS URLs.' },
            400,
          );
        }
      }
      const result = await db
        .prepare(
          "INSERT OR IGNORE INTO proposals (id,task_id,user_id,name,title,body,url,status,feedback,created_at,artifact_id,parent_id) SELECT ?,?,?,?,?,?,?,'pending','',?,?,? WHERE EXISTS (SELECT 1 FROM claims WHERE task_id=? AND user_id=?) AND NOT EXISTS (SELECT 1 FROM proposals WHERE task_id=? AND user_id=? AND status='pending') AND (? IS NULL OR EXISTS (SELECT 1 FROM artifacts WHERE id=? AND user_id=? AND task_id=? AND ready=1)) AND (? IS NULL OR EXISTS (SELECT 1 FROM proposals WHERE id=? AND task_id=? AND status IN ('accepted','changes_requested')))",
        )
        .bind(
          data.id,
          data.taskId,
          user.id,
          user.name,
          title,
          body,
          url,
          now,
          data.artifactId || null,
          data.parentId || null,
          data.taskId,
          user.id,
          data.taskId,
          user.id,
          data.artifactId || null,
          data.artifactId || null,
          user.id,
          data.taskId,
          data.parentId || null,
          data.parentId || null,
          data.taskId,
        )
        .run();
      if (!result.meta.changes) {
        const existing = await db
          .prepare('SELECT id FROM proposals WHERE id=? AND user_id=?')
          .bind(data.id, user.id)
          .first();
        if (!existing)
          return json(
            {
              error:
                'Claim this task and wait for any pending review. Attach only your own completed upload and an eligible earlier contribution.',
            },
            409,
          );
      }
    } else if (data.action === 'review') {
      if (!user.isMaintainer)
        return json(
          { error: 'Only the maintainer can review contributions.' },
          403,
        );
      if (
        typeof data.id !== 'string' ||
        !['accepted', 'changes_requested'].includes(data.status) ||
        typeof data.feedback !== 'string' ||
        data.feedback.length > 2000 ||
        !data.feedback.trim()
      )
        return json(
          { error: 'Add a review note (up to 2,000 characters).' },
          400,
        );
      const result = await db
        .prepare(
          "UPDATE proposals SET status=?,feedback=?,reviewer=?,reviewed_at=?,revision=CASE WHEN ?='accepted' THEN (SELECT COALESCE(MAX(revision),0)+1 FROM proposals) ELSE NULL END WHERE id=? AND status='pending'",
        )
        .bind(
          data.status,
          data.feedback.trim(),
          user.id,
          now,
          data.status,
          data.id,
        )
        .run();
      if (!result.meta.changes)
        return json(
          {
            error:
              'This contribution has already been reviewed. Refresh to see its decision.',
          },
          409,
        );
    } else return json({ error: 'Unknown action.' }, 400);
    return json(await snapshot(req));
  } catch (error) {
    console.error(
      'Collaboration operation failed',
      error instanceof Error ? error.message : 'unknown',
    );
    return json(
      {
        error:
          'The change could not be saved. Your draft is still here; please retry.',
      },
      503,
    );
  }
}
