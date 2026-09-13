import { database, bucket } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { boundedBody } from '@/lib/artifacts';
import {
  ensureRepository,
  readCommit,
  prepareCommit,
  ancestry,
} from '@/db/mission-git';
import { leadScopes, coversModules, scopeGuard } from '@/db/team-access';
import { moduleKey } from '@/lib/teams';
import { validWrittenDraft, draftText } from '@/lib/written-draft';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
type Artifact = {
  action_id: string | null;
  action_revision: number | null;
  input_head: string | null;
  tool: string | null;
  module?: string | null;
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
      if (!preview && item.tool === 'mission-writer' && q.get('read') === '1') {
        const value = await new Response(file.body).json();
        if (!validWrittenDraft(value))
          return json({ error: 'The written result is unavailable.' }, 503);
        return json({ draft: value });
      }
      return new Response(file.body, {
        headers: {
          'Content-Type': preview ? 'image/png' : 'application/octet-stream',
          'Content-Disposition':
            (preview
              ? 'inline; filename="preview-'
              : 'attachment; filename="workshop-') +
            item.id +
            (preview
              ? '.png"'
              : item.tool === 'mission-writer'
                ? '.json"'
                : '.zip"'),
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, no-store',
          'Content-Security-Policy': "sandbox; default-src 'none'",
        },
      });
    }
    const rows = await database()
      .prepare(
        "SELECT w.id,w.author,w.prompt,w.model,w.size,w.sha256,w.status,w.created_at,w.feedback,w.reviewer,w.reviewed_at,w.action_id,w.action_revision,w.input_head,w.tool,t.module,(w.preview_key IS NOT NULL) AS hasPreview FROM workshop_artifacts w LEFT JOIN planned_tasks t ON t.action_id=w.action_id WHERE w.mission=? AND w.status!='uploading' ORDER BY w.created_at DESC LIMIT 100",
      )
      .bind(mission)
      .all<Artifact>();
    const scopes = await leadScopes(mission, access.id);
    return json({
      artifacts: rows.results.map((r) => ({
        ...r,
        canAccept: coversModules(
          access.owner,
          scopes,
          r.module ? [r.module] : [],
        ),
      })),
      canAccept: access.owner,
    });
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
      const item = await db
        .prepare('SELECT * FROM workshop_artifacts WHERE id=? AND mission=?')
        .bind(id, mission)
        .first<Artifact>();
      if (!item || item.status === 'uploading')
        return json({ error: 'Result not found.' }, 404);
      const task = item.action_id
        ? await db
            .prepare(
              'SELECT a.*,t.module FROM mission_actions a LEFT JOIN planned_tasks t ON t.action_id=a.id WHERE a.id=? AND a.mission=?',
            )
            .bind(item.action_id, mission)
            .first<{
              id: string;
              revision: number;
              status: string;
              assignee_id: string | null;
              module: string | null;
            }>()
        : null;
      const scopes = await leadScopes(mission, access.id),
        modules = task?.module ? [moduleKey(task.module)] : ['__unscoped__'];
      if (
        !coversModules(access.owner, scopes, task?.module ? [task.module] : [])
      )
        return json(
          {
            error:
              'Only the mission owner or the linked task’s subdivision lead can review this result.',
          },
          403,
        );
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
      if (
        item.action_id &&
        (!task ||
          task.status !== 'review' ||
          task.revision !== Number(item.action_revision) + 1 ||
          task.assignee_id !== item.user_id)
      )
        return json(
          {
            error:
              'The linked task changed. Refresh its board before reviewing.',
          },
          409,
        );
      const taskGuard =
        "(? IS NULL OR EXISTS(SELECT 1 FROM mission_actions WHERE id=? AND status='review' AND revision=? AND assignee_id=?))";
      const taskArgs = [
        item.action_id,
        item.action_id,
        Number(item.action_revision) + 1,
        item.user_id,
      ];
      const roleArgs = [
        Number(access.owner),
        JSON.stringify(modules),
        mission,
        access.id,
      ];
      const event = crypto.randomUUID();
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
        const statements = [
          db
            .prepare(
              "UPDATE workshop_artifacts SET status='changes_requested',feedback=?,reviewer=?,reviewed_at=? WHERE id=? AND status='shared' AND " +
                taskGuard +
                ' AND ' +
                scopeGuard,
            )
            .bind(
              feedback,
              access.author,
              reviewedAt,
              id,
              ...taskArgs,
              ...roleArgs,
            ),
        ];
        if (task) {
          statements.push(
            db
              .prepare(
                "UPDATE mission_actions SET status='doing',revision=revision+1,last_event=?,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM workshop_artifacts WHERE id=? AND status='changes_requested' AND reviewed_at=?)",
              )
              .bind(event, reviewedAt, task.id, task.revision, id, reviewedAt),
          );
          statements.push(
            db
              .prepare(
                "INSERT INTO action_events(id,action_id,user_id,author,kind,body,url,revision,created_at) SELECT ?,id,?,?,'revise',?,'',revision,? FROM mission_actions WHERE id=? AND last_event=?",
              )
              .bind(
                event,
                access.id,
                access.author,
                feedback,
                reviewedAt,
                task.id,
                event,
              ),
          );
        }
        const r = await db.batch(statements);
        return r[0].meta.changes
          ? json({ saved: true })
          : json({ error: 'Review changed. Refresh.' }, 409);
      }
      const repo = await ensureRepository(mission),
        prior = await readCommit(repo.head);
      const files: Record<string, string> = {
        ...prior.files,
        ['workshop-' + id + '.json']: JSON.stringify(
          {
            artifact: id,
            sha256: item.sha256,
            prompt: item.prompt,
            model: item.model,
            task: item.action_id,
            inputHead: item.input_head,
            tool: item.tool,
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
      if (item.tool === 'mission-writer') {
        const stored = await bucket().get(item.object_key);
        if (!stored)
          return json(
            { error: 'Written result unavailable. Retry before approving.' },
            503,
          );
        const value = await new Response(stored.body).json();
        if (!validWrittenDraft(value))
          return json({ error: 'The written draft failed validation.' }, 400);
        delete files['workshop-' + id + '.json'];
        files['draft-' + id + '.md'] =
          draftText(value) +
          '\n## Contribution record\n\n' +
          JSON.stringify(
            {
              artifact: id,
              sha256: item.sha256,
              model: item.model,
              task: item.action_id,
              inputHead: item.input_head,
              author: item.author,
              reviewer: access.author,
              reviewedAt,
            },
            null,
            2,
          ) +
          '\n';
      }
      if (
        Object.keys(files).filter(
          (p) =>
            ![
              'mission.json',
              'mission-tools.json',
              'mission-plan.json',
              'mission-team.json',
            ].includes(p),
        ).length > 12
      )
        return json(
          {
            error:
              'The pilot workspace is full. Remove a working file before accepting another result.',
          },
          409,
        );
      if (
        Object.values(files).reduce(
          (size, text) => size + new TextEncoder().encode(text).length,
          0,
        ) > 65536
      )
        return json(
          {
            error:
              'The mission working files are at the 64 KB pilot limit. Archive or shorten a working file before accepting this contribution.',
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
            "UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND EXISTS(SELECT 1 FROM workshop_artifacts WHERE id=? AND status='shared') AND " +
              taskGuard +
              ' AND ' +
              scopeGuard,
          )
          .bind(
            commit.row.oid,
            mission,
            repo.head,
            id,
            ...taskArgs,
            ...roleArgs,
          ),
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
        ...(task
          ? [
              db
                .prepare(
                  "UPDATE mission_actions SET status='done',revision=revision+1,last_event=?,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?)",
                )
                .bind(
                  event,
                  reviewedAt,
                  task.id,
                  task.revision,
                  mission,
                  commit.row.oid,
                ),
              db
                .prepare(
                  "INSERT INTO action_events(id,action_id,user_id,author,kind,body,url,revision,created_at) SELECT ?,id,?,?,'accept',?,'',revision,? FROM mission_actions WHERE id=? AND last_event=?",
                )
                .bind(
                  event,
                  access.id,
                  access.author,
                  feedback,
                  reviewedAt,
                  task.id,
                  event,
                ),
            ]
          : []),
      ]);
      return result[1].meta.changes
        ? json({ saved: true })
        : json({ error: 'The mission changed. Refresh and retry.' }, 409);
    }
    const prompt = q.get('prompt') || '',
      model = q.get('model') || '';
    const taskId = q.get('taskId'),
      taskRevision = taskId ? Number(q.get('taskRevision')) : null,
      inputHead = q.get('inputHead'),
      tool = q.get('tool');
    if (tool && !/^[a-z][a-z0-9-]{1,39}$/.test(tool))
      return json({ error: 'Invalid tool ID.' }, 400);
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
        previous.action_id === taskId &&
        previous.action_revision === taskRevision &&
        previous.input_head === inputHead &&
        previous.tool === tool &&
        previous.prompt === prompt &&
        previous.model === model &&
        previous.status !== 'uploading'
        ? json({ saved: true })
        : json(
            { error: 'This upload is pending or its ID is already used.' },
            409,
          );
    if (taskId) {
      if (
        !Number.isInteger(taskRevision) ||
        !inputHead ||
        !/^[0-9a-f]{40}$/.test(inputHead) ||
        !tool
      )
        return json(
          { error: 'Missing task revision, tool or input history.' },
          400,
        );
      const task = await db
        .prepare(
          "SELECT id FROM mission_actions WHERE id=? AND mission=? AND assignee_id=? AND status='doing' AND revision=?",
        )
        .bind(taskId, mission, access.id, taskRevision)
        .first();
      if (!task)
        return json(
          { error: 'The task is no longer assigned to you at this revision.' },
          409,
        );
      const repo = await ensureRepository(mission);
      if (!(await ancestry(repo.head)).some((c) => c.oid === inputHead))
        return json(
          { error: 'Input history does not belong to this mission.' },
          400,
        );
      const planned = await db
        .prepare(
          'SELECT t.task_key,p.body FROM planned_tasks t JOIN mission_plans p ON p.id=t.plan_id WHERE t.action_id=?',
        )
        .bind(taskId)
        .first<{ task_key: string; body: string }>();
      const tools = planned
        ? JSON.parse(planned.body).tasks.find(
            (t: { key: string }) => t.key === planned.task_key,
          )?.tools || []
        : [];
      if (tools.length && !tools.includes(tool))
        return json(
          { error: 'This tool is not among the approved task requirements.' },
          400,
        );
    } else if (inputHead || q.get('taskRevision'))
      return json({ error: 'Task context requires a task ID.' }, 400);
    let bytes: Uint8Array;
    try {
      bytes = await boundedBody(req, 10 * 1024 * 1024);
    } catch {
      return json({ error: 'Result must be between 1 byte and 10 MB.' }, 413);
    }
    if (tool === 'mission-writer') {
      if (bytes.length > 32000)
        return json({ error: 'Written results must be under 32 KB.' }, 413);
      let value;
      try {
        value = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        );
      } catch {
        return json({ error: 'Share a valid written draft.' }, 400);
      }
      if (!validWrittenDraft(value))
        return json(
          {
            error:
              'The draft must include a title, written body and review checks, within 32 KB.',
          },
          400,
        );
    } else if (
      bytes[0] !== 80 ||
      bytes[1] !== 75 ||
      bytes[2] !== 3 ||
      bytes[3] !== 4
    )
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
        "INSERT INTO workshop_artifacts (id,mission,user_id,author,prompt,model,object_key,size,sha256,status,created_at,action_id,action_revision,input_head,tool) SELECT ?,?,?,?,?,?,?,?,?,'uploading',?,?,?,?,? WHERE (SELECT COALESCE(SUM(size+CASE WHEN preview_key IS NOT NULL THEN 1048576 ELSE 0 END),0) FROM workshop_artifacts WHERE user_id=?)+?<=104857600",
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
        taskId,
        taskRevision,
        inputHead,
        tool,
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
      const event = crypto.randomUUID(),
        now = new Date().toISOString();
      const statements = [
        db
          .prepare(
            "UPDATE workshop_artifacts SET status='shared' WHERE id=? AND (? IS NULL OR EXISTS(SELECT 1 FROM mission_actions WHERE id=? AND mission=? AND assignee_id=? AND status='doing' AND revision=?))",
          )
          .bind(id, taskId, taskId, mission, access.id, taskRevision),
      ];
      if (taskId) {
        statements.push(
          db
            .prepare(
              "UPDATE mission_actions SET status='review',revision=revision+1,last_event=?,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM workshop_artifacts WHERE id=? AND status='shared')",
            )
            .bind(event, now, taskId, taskRevision, id),
        );
        statements.push(
          db
            .prepare(
              "INSERT INTO action_events(id,action_id,user_id,author,kind,body,url,revision,created_at) SELECT ?,id,?,?,'submit',?,?,revision,? FROM mission_actions WHERE id=? AND last_event=?",
            )
            .bind(
              event,
              access.id,
              access.author,
              'Shared a tool result for review: ' + prompt.slice(0, 1000),
              '/api/workshop?mission=' +
                encodeURIComponent(mission) +
                '&id=' +
                id,
              now,
              taskId,
              event,
            ),
        );
      }
      const finalized = await db.batch(statements);
      if (!finalized[0].meta.changes)
        throw Error('Task changed while uploading.');
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
