import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
type Entry = {
  id: string;
  kind: string;
  author: string;
  title: string;
  body: string;
  url?: string;
  revision?: number;
  created_at: string;
  snapshot?: Record<string, unknown>;
};
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      mission = q.get('mission') || '';
    if (!(await missionAccess(req, mission)))
      return Response.json({ error: 'Mission not found.' }, { status: 404 });
    const db = database();
    const versions = await db
      .prepare(
        'SELECT id,revision,author,message,snapshot,created_at FROM mission_revisions WHERE mission=? ORDER BY revision DESC LIMIT 200',
      )
      .bind(mission)
      .all<{
        id: string;
        revision: number;
        author: string;
        message: string;
        snapshot: string;
        created_at: string;
      }>();
    const entries: Entry[] = versions.results.map((v) => ({
      id: 'version:' + v.id,
      kind: 'brief',
      author: v.author,
      title: v.message,
      body: 'Mission brief · revision ' + v.revision,
      revision: v.revision,
      created_at: v.created_at,
      snapshot: JSON.parse(v.snapshot),
    }));
    const actions = await db
      .prepare(
        'SELECT e.id,e.author,e.kind,e.body,e.url,e.revision,e.created_at,a.title FROM action_events e JOIN mission_actions a ON a.id=e.action_id WHERE a.mission=? ORDER BY e.created_at DESC,e.revision DESC LIMIT 200',
      )
      .bind(mission)
      .all<{
        id: string;
        author: string;
        kind: string;
        body: string;
        url: string;
        revision: number;
        created_at: string;
        title: string;
      }>();
    for (const a of actions.results)
      entries.push({ ...a, id: 'action:' + a.id, kind: 'action:' + a.kind });
    const posts = await db
      .prepare(
        'SELECT id,author,kind,body,created_at FROM mission_posts WHERE mission=? ORDER BY created_at DESC LIMIT 200',
      )
      .bind(mission)
      .all<{
        id: string;
        author: string;
        kind: string;
        body: string;
        created_at: string;
      }>();
    for (const p of posts.results)
      entries.push({
        ...p,
        id: 'post:' + p.id,
        title:
          p.kind === 'reply'
            ? 'Conversation reply'
            : p.kind === 'question'
              ? 'Open question'
              : p.kind === 'next_step'
                ? 'Next step'
                : 'Progress update',
        kind: 'post',
      });
    if (mission === 'mahabharata') {
      const proposals = await db
        .prepare(
          'SELECT id,name,title,body,url,status,feedback,reviewer,created_at,reviewed_at,revision FROM proposals ORDER BY created_at DESC LIMIT 200',
        )
        .all<{
          id: string;
          name: string;
          title: string;
          body: string;
          url: string;
          status: string;
          feedback: string;
          reviewer: string | null;
          created_at: string;
          reviewed_at: string | null;
          revision: number | null;
        }>();
      for (const p of proposals.results) {
        entries.push({
          id: 'proposal:' + p.id,
          kind: 'submission',
          author: p.name,
          title: p.title,
          body: p.body,
          url: p.url,
          created_at: p.created_at,
        });
        if (p.reviewed_at)
          entries.push({
            id: 'review:' + p.id,
            kind: 'review',
            author: p.reviewer || 'Maintainer',
            title:
              p.status === 'accepted'
                ? 'Contribution accepted'
                : 'Changes requested',
            body: p.feedback,
            revision: p.revision || undefined,
            created_at: p.reviewed_at,
          });
      }
    }
    entries.sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) ||
        (b.revision || 0) - (a.revision || 0) ||
        b.id.localeCompare(a.id),
    );
    const data = {
      mission,
      scope:
        'Latest 200 records per history category. Brief snapshots begin with the history feature; earlier edits cannot be reconstructed.',
      entries,
    };
    return Response.json(data, {
      headers: {
        'Cache-Control': 'no-store',
        ...(q.get('download') === '1'
          ? {
              'Content-Disposition':
                'attachment; filename="mission-history.json"',
              'X-Content-Type-Options': 'nosniff',
            }
          : {}),
      },
    });
  } catch {
    return Response.json(
      { error: 'History could not be loaded.' },
      { status: 503 },
    );
  }
}
