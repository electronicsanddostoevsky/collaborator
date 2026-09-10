import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { ensureRepository, readCommit, prepareCommit } from '@/db/mission-git';
import { validWorkspacePath, workspaceSize } from '@/lib/workspace-files';
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  try {
    const mission = new URL(req.url).searchParams.get('mission') || '',
      access = await missionAccess(req, mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    const repo = await ensureRepository(mission),
      data = await readCommit(repo.head);
    return json({
      head: repo.head,
      files: data.files,
      canEdit: access.owner,
      forkPolicy: repo.fork_policy,
    });
  } catch {
    return json({ error: 'Workspace could not be loaded.' }, 503);
  }
}
export async function POST(req: Request) {
  if (
    !req.headers.get('oai-authenticated-user-id') ||
    !req.headers.get('oai-authenticated-user-email')
  )
    return json({ error: 'Sign in to change a workspace.' }, 401);
  if (req.headers.get('origin') !== new URL(req.url).origin)
    return json({ error: 'Request origin is not allowed.' }, 403);
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    return json({ error: 'Use a JSON request.' }, 415);
  try {
    const raw = await req.text();
    if (raw.length > 120000)
      return json(
        { error: 'This workspace is limited to small text files.' },
        413,
      );
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
      typeof d.mission !== 'string' ||
      !validWorkspacePath(d.path) ||
      typeof d.content !== 'string' ||
      typeof d.message !== 'string' ||
      d.message.trim().length < 5 ||
      d.message.length > 200 ||
      typeof d.base !== 'string' ||
      !['save', 'delete'].includes(d.operation)
    )
      return json(
        {
          error:
            'Choose a safe text filename and add a short change description. mission.json is managed through the mission brief.',
        },
        400,
      );
    const access = await missionAccess(req, d.mission);
    if (!access) return json({ error: 'Mission not found.' }, 404);
    if (!access.owner)
      return json(
        {
          error:
            'Only the mission creator can change its workspace. Fork the mission to explore your own direction.',
        },
        403,
      );
    const db = database(),
      previous = await db
        .prepare('SELECT * FROM workspace_writes WHERE id=?')
        .bind(d.id)
        .first<{ mission: string; user_id: string; head: string }>();
    if (previous)
      return previous.mission === d.mission && previous.user_id === access.id
        ? json({ head: previous.head })
        : json({ error: 'This request ID is already used.' }, 409);
    const repo = await ensureRepository(d.mission);
    if (repo.head !== d.base)
      return json(
        {
          error:
            'The workspace changed. Copy your draft, then refresh and compare before saving.',
        },
        409,
      );
    const current = await readCommit(repo.head);
    const files: Record<string, string> = { ...current.files };
    if (
      Object.keys(files).some(
        (path) =>
          path !== d.path && path.toLowerCase() === d.path.toLowerCase(),
      )
    )
      return json(
        {
          error:
            'A file with that name already exists with different capitalization.',
        },
        400,
      );
    if (d.operation === 'delete') {
      if (!(d.path in files)) return json({ error: 'File not found.' }, 404);
      delete files[d.path];
    } else {
      if (files[d.path] === d.content) return json({ head: repo.head });
      files[d.path] = d.content;
    }
    if (
      Object.keys(files).filter(
        (p) => !['mission.json', 'mission-tools.json', 'mission-plan.json'].includes(p),
      ).length > 12 ||
      workspaceSize(files) > 65536 ||
      new TextEncoder().encode(d.content).length > 16384
    )
      return json(
        {
          error:
            'Use up to 12 working files, 16 KB per file, and 64 KB total including the mission brief.',
        },
        413,
      );
    const commit = await prepareCommit(
      d.mission,
      JSON.parse(current.blob),
      repo.head,
      access.author,
      d.message.trim(),
      new Date().toISOString(),
      files,
    );
    const results = await db.batch([
      commit.statement,
      db
        .prepare(
          'UPDATE mission_repositories SET head=? WHERE mission=? AND head=?',
        )
        .bind(commit.row.oid, d.mission, repo.head),
      db
        .prepare(
          'INSERT INTO workspace_writes (id,mission,user_id,head) SELECT ?,mission,?,head FROM mission_repositories WHERE mission=? AND head=?',
        )
        .bind(d.id, access.id, d.mission, commit.row.oid),
    ]);
    if (!results[1].meta.changes)
      return json(
        {
          error:
            'Someone changed the workspace. Your draft is preserved; refresh and compare.',
        },
        409,
      );
    return json({ head: commit.row.oid });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && e.message.includes('200 commits')
            ? e.message
            : 'Could not save the file. Your draft is still here.',
      },
      503,
    );
  }
}
