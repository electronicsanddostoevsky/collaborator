import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import {
  ensureRepository,
  readCommit,
  prepareCommit,
  ancestry,
} from '@/db/mission-git';
import { compareFiles } from '@/lib/merge-files';
type Proposal = {
  id: string;
  source: string;
  target: string;
  base: string;
  source_head: string;
  target_head: string;
  user_id: string;
  author: string;
  title: string;
  description: string;
  status: string;
  feedback: string;
  reviewer: string | null;
  merge_head: string | null;
  created_at: string;
  reviewed_at: string | null;
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function comparison(p: Proposal) {
  const [base, source, target] = await Promise.all([
    readCommit(p.base),
    readCommit(p.source_head),
    readCommit(p.target_head),
  ]);
  return {
    ...compareFiles(base.files, source.files, target.files),
    snapshot: JSON.parse(target.blob),
  };
}
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      mission = q.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database(),
      repo = await ensureRepository(mission),
      id = q.get('id');
    if (id) {
      const p = await db
        .prepare(
          'SELECT * FROM merge_requests WHERE id=? AND (source=? OR target=?)',
        )
        .bind(id, mission, mission)
        .first<Proposal>();
      if (!p) return json({ error: 'Proposal not found.' }, 404);
      const { user_id, ...safe } = p;
      const diff = await comparison(p);
      return json({
        proposal: safe,
        changes: diff.changes,
        conflicts: diff.conflicts,
        canReview: access.owner && p.target === mission,
        canClose:
          access.owner && (p.target === mission || p.source === mission),
      });
    }
    const rows = await db
      .prepare(
        'SELECT * FROM merge_requests WHERE source=? OR target=? ORDER BY created_at DESC LIMIT 100',
      )
      .bind(mission, mission)
      .all<Proposal>();
    return json({
      proposals: rows.results.map(({ user_id, ...p }) => p),
      upstream: repo.upstream,
      sourceHead: repo.head,
      canPropose: access.owner && !!repo.upstream,
    });
  } catch {
    return json({ error: 'Proposals could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to contribute.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Use a JSON request.' }, 415);
  try {
    const raw = await req.text();
    if (raw.length > 6000)
      return json({ error: 'Keep the proposal short.' }, 413);
    let d;
    try {
      d = JSON.parse(raw);
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    if (
      !d ||
      typeof d.id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(d.id) ||
      typeof d.mission !== 'string'
    )
      return json({ error: 'Invalid proposal.' }, 400);
    const access = await missionAccess(req, d.mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const db = database(),
      now = new Date().toISOString();
    if (d.operation === 'propose') {
      if (!access.owner)
        return json(
          { error: 'Only the fork creator can propose its changes.' },
          403,
        );
      const previous = await db
        .prepare('SELECT * FROM merge_requests WHERE id=?')
        .bind(d.id)
        .first<Proposal>();
      if (previous)
        return previous.user_id === access.id && previous.source === d.mission
          ? json({ id: previous.id })
          : json({ error: 'This ID is already used.' }, 409);
      if (
        typeof d.title !== 'string' ||
        d.title.trim().length < 5 ||
        d.title.length > 120 ||
        typeof d.description !== 'string' ||
        d.description.trim().length < 10 ||
        d.description.length > 3000
      )
        return json(
          { error: 'Add a title and explain what your contribution changes.' },
          400,
        );
      const source = await ensureRepository(d.mission);
      if (!source.upstream || !source.fork_base)
        return json(
          {
            error: 'This mission has no upstream. Propose changes from a fork.',
          },
          400,
        );
      if (d.sourceHead !== source.head)
        return json(
          { error: 'Your fork changed. Refresh before proposing it.' },
          409,
        );
      const target = await ensureRepository(source.upstream);
      const targetAncestors = new Set(
        (await ancestry(target.head)).map((c) => c.oid),
      );
      const shared = (await ancestry(source.head)).find((c) =>
        targetAncestors.has(c.oid),
      );
      if (!shared)
        return json({ error: 'The missions have no shared history.' }, 409);
      const p = {
        base: shared.oid,
        source_head: source.head,
        target_head: target.head,
      } as Proposal;
      const diff = await comparison(p);
      if (!diff.changes.length)
        return json(
          {
            error:
              'No new working-file changes to propose. Mission brief changes stay independent.',
          },
          400,
        );
      const result = await db
        .prepare(
          "INSERT INTO merge_requests (id,source,target,base,source_head,target_head,user_id,author,title,description,status,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,'pending',? WHERE (SELECT COUNT(*) FROM merge_requests WHERE user_id=? AND status='pending')<10",
        )
        .bind(
          d.id,
          d.mission,
          source.upstream,
          shared.oid,
          source.head,
          target.head,
          access.id,
          access.author,
          d.title.trim(),
          d.description.trim(),
          now,
          access.id,
        )
        .run();
      if (!result.meta.changes)
        return json(
          {
            error: 'Resolve an existing proposal before opening more than ten.',
          },
          409,
        );
      return json({ id: d.id }, 201);
    }
    const p = await db
      .prepare(
        'SELECT * FROM merge_requests WHERE id=? AND (source=? OR target=?)',
      )
      .bind(d.id, d.mission, d.mission)
      .first<Proposal>();
    if (!p) return json({ error: 'Proposal not found.' }, 404);
    if (!access.owner || (d.operation === 'merge' && p.target !== d.mission))
      return json(
        {
          error:
            'Only the upstream creator can merge. Creators can close their own proposals.',
        },
        403,
      );
    if (!['merge', 'close'].includes(d.operation))
      return json({ error: 'Unknown review action.' }, 400);
    if (p.status !== 'pending')
      return p.status === (d.operation === 'merge' ? 'merged' : 'closed')
        ? json({ saved: true, head: p.merge_head })
        : json({ error: 'This proposal has already been decided.' }, 409);
    if (
      typeof d.feedback !== 'string' ||
      d.feedback.trim().length < 5 ||
      d.feedback.length > 2000
    )
      return json(
        { error: 'Leave a short explanation of your decision.' },
        400,
      );
    if (d.operation === 'close') {
      const r = await db
        .prepare(
          "UPDATE merge_requests SET status='closed',feedback=?,reviewer=?,reviewed_at=? WHERE id=? AND status='pending'",
        )
        .bind(d.feedback.trim(), access.author, now, p.id)
        .run();
      return r.meta.changes
        ? json({ saved: true })
        : json({ error: 'This proposal changed. Refresh.' }, 409);
    }
    const target = await ensureRepository(p.target);
    if (target.head !== p.target_head)
      return json(
        {
          error:
            'Upstream changed since this proposal. Close this proposal and submit a fresh comparison.',
        },
        409,
      );
    const diff = await comparison(p);
    const resolutions: Record<string, string> = {};
    for (const change of diff.changes.filter((c) => c.conflict)) {
      const choice = d.resolutions?.[change.path];
      if (!['current', 'proposed'].includes(choice))
        return json(
          {
            error:
              'Review each conflicting file and choose which version to keep.',
          },
          409,
        );
      resolutions[change.path] = choice;
      const content = choice === 'current' ? change.current : change.proposed;
      if (content === null) delete diff.files[change.path];
      else diff.files[change.path] = content;
    }
    if (Object.keys(diff.files).length > 13)
      return json(
        { error: 'Merging would exceed the workspace file limit.' },
        413,
      );
    const paths = Object.keys(diff.files).map((p) => p.toLowerCase());
    if (new Set(paths).size !== paths.length)
      return json(
        {
          error:
            'The combined workspace has filenames that differ only by capitalization.',
        },
        409,
      );
    const commit = await prepareCommit(
      p.target,
      diff.snapshot,
      p.target_head,
      access.author,
      'Merge: ' + p.title,
      now,
      diff.files,
      p.source_head,
    );
    const results = await db.batch([
      commit.statement,
      db
        .prepare(
          "UPDATE mission_repositories SET head=? WHERE mission=? AND head=? AND EXISTS(SELECT 1 FROM merge_requests WHERE id=? AND status='pending')",
        )
        .bind(commit.row.oid, p.target, p.target_head, p.id),
      db
        .prepare(
          "UPDATE merge_requests SET status='merged',feedback=?,reviewer=?,reviewed_at=?,merge_head=?,resolutions=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM mission_repositories WHERE mission=? AND head=?)",
        )
        .bind(
          d.feedback.trim(),
          access.author,
          now,
          commit.row.oid,
          JSON.stringify(resolutions),
          p.id,
          p.target,
          commit.row.oid,
        ),
    ]);
    if (!results[1].meta.changes)
      return json(
        {
          error: 'Upstream or the proposal changed. Refresh before reviewing.',
        },
        409,
      );
    return json({ saved: true, head: commit.row.oid });
  } catch {
    return json(
      { error: 'The proposal could not be saved. Your draft is still here.' },
      503,
    );
  }
}
