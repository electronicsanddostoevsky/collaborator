import { database } from '@/db/client';
import { missionAccess } from '@/db/mission-access';
import { ensureRepository } from '@/db/mission-git';
const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      mission = q.get('mission') || '',
      id = q.get('task') || '',
      access = await missionAccess(req, mission);
    if (!access?.id)
      return json({ error: 'Sign in to work on this task.' }, 401);
    const db = database(),
      task = await db
        .prepare(
          'SELECT id,title,brief,done_when,status,revision,assignee_id FROM mission_actions WHERE id=? AND mission=?',
        )
        .bind(id, mission)
        .first<{
          id: string;
          title: string;
          brief: string;
          done_when: string;
          status: string;
          revision: number;
          assignee_id: string | null;
        }>();
    if (!task) return json({ error: 'Task not found.' }, 404);
    if (task.assignee_id !== access.id || task.status !== 'doing')
      return json(
        {
          error:
            'Claim this task before opening its tools. A submitted task must be reviewed before another iteration.',
        },
        409,
      );
    const planned = await db
      .prepare(
        'SELECT t.task_key,t.module,p.body FROM planned_tasks t JOIN mission_plans p ON p.id=t.plan_id WHERE t.action_id=?',
      )
      .bind(id)
      .first<{ task_key: string; module: string; body: string }>();
    const tools = planned
      ? JSON.parse(planned.body).tasks.find(
          (t: { key: string }) => t.key === planned.task_key,
        )?.tools || []
      : [];
    const repo = await ensureRepository(mission);
    return json({
      id: task.id,
      title: task.title,
      revision: task.revision,
      inputHead: repo.head,
      module: planned?.module || null,
      tools,
      prompt:
        task.brief.slice(0, 1800) +
        '\n\nAcceptance criteria: ' +
        task.done_when,
    });
  } catch {
    return json({ error: 'Task context could not be loaded.' }, 503);
  }
}
