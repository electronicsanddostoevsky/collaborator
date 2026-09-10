'use client';
import { useEffect, useRef, useState } from 'react';
import { validPlan, type WorkPlan, type PlanTask } from '@/lib/planning';
import Actions from './actions';

type SharedPlan = {
  canDecide: boolean;
  id: string;
  body: WorkPlan;
  author: string;
  model: string;
  status: string;
  revision: number;
  feedback: string;
  reviewer: string | null;
  head: string | null;
};
type LocalStatus = {
  tools: { id: string }[];
  models: string[];
  jobs: { id: string; status: string; error?: string }[];
};
type Overview = {
  plans: SharedPlan[];
  canApprove: boolean;
  canPropose: boolean;
};
const empty: WorkPlan = { summary: '', tasks: [] };
function TaskEditor({
  task,
  change,
}: {
  task: PlanTask;
  change: (task: PlanTask) => void;
}) {
  return (
    <fieldset className="plan-task">
      <legend>{task.title || 'New task'}</legend>
      {(
        [
          'key',
          'module',
          'title',
          'brief',
          'inputs',
          'outputs',
          'doneWhen',
        ] as const
      ).map((field) => (
        <label key={field}>
          {
            {
              key: 'Task key',
              module: 'Team / discipline',
              title: 'Title',
              brief: 'Work to do',
              inputs: 'Inputs needed',
              outputs: 'Deliverable',
              doneWhen: 'Acceptance criteria',
            }[field]
          }
          <textarea
            rows={field === 'brief' || field === 'doneWhen' ? 3 : 1}
            value={task[field]}
            onChange={(e) => change({ ...task, [field]: e.target.value })}
          />
        </label>
      ))}
      <label>
        Depends on task keys, separated by commas
        <input
          value={task.dependsOn.join(', ')}
          onChange={(e) =>
            change({
              ...task,
              dependsOn: e.target.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
      <label>
        Required tool IDs, separated by commas
        <input
          value={task.tools.join(', ')}
          onChange={(e) =>
            change({
              ...task,
              tools: e.target.value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean),
            })
          }
        />
      </label>
    </fieldset>
  );
}
export default function Planning({
  mission,
  title,
}: {
  mission: string;
  title: string;
}) {
  const [overview, setOverview] = useState<Overview>({
      plans: [],
      canApprove: false,
      canPropose: false,
    }),
    [brief, setBrief] = useState(
      `Propose the smallest useful collaborative first milestone for ${title}. Split the work across disciplines, with concrete outputs, dependencies and human acceptance criteria.`,
    ),
    [draft, setDraft] = useState<WorkPlan>(empty),
    [model, setModel] = useState(''),
    [models, setModels] = useState<string[]>([]),
    [code, setCode] = useState(''),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [phase, setPhase] = useState(''),
    [editing, setEditing] = useState<SharedPlan | null>(null),
    [boardVersion, setBoardVersion] = useState(0),
    [decision, setDecision] = useState('');
  const active = useRef<string | null>(null),
    alive = useRef(true),
    draftId = useRef(crypto.randomUUID());
  async function load() {
    const r = await fetch('/api/plans?mission=' + encodeURIComponent(mission));
    const data = (await r.json()) as Overview & { error?: string };
    if (!r.ok) throw Error(data.error);
    if (alive.current) setOverview(data);
  }
  useEffect(() => {
    alive.current = true;
    load().catch((e) => setError(e.message));
    return () => {
      alive.current = false;
    };
  }, [mission]);
  async function local(path: string, payload?: unknown) {
    const r = await fetch('http://127.0.0.1:8765' + path, {
      method: payload ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + code,
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) {
      let message = 'Local workshop request failed.';
      try {
        message = ((await r.json()) as { error?: string }).error || message;
      } catch {}
      throw Error(message);
    }
    return r;
  }
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not complete this step.',
      );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function connect() {
    const s = (await (await local('/status')).json()) as LocalStatus;
    if (!s.tools?.some((t: { id: string }) => t.id === 'mission-planner'))
      throw Error(
        'Download the updated workshop and restart its local window to enable planning.',
      );
    setModels(s.models);
    setModel(s.models[0] || '');
    setConnected(true);
    setPhase(
      'Connected. Planning uses your local model and does not execute project tasks.',
    );
  }
  async function generate() {
    const id = crypto.randomUUID();
    active.current = id;
    setPhase('Your local agent is drafting a plan…');
    try {
      await local('/run', {
        id,
        mission,
        tool: 'mission-planner',
        model,
        prompt: brief,
      });
      const until = Date.now() + 300000;
      while (alive.current && Date.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const s = (await (await local('/status')).json()) as LocalStatus,
          job = s.jobs.find((j: { id: string }) => j.id === id);
        if (!job)
          throw Error('Local run is unavailable. Check the workshop window.');
        if (['failed', 'stopped'].includes(job.status))
          throw Error(job.error || 'Planning stopped.');
        if (job.status === 'ready') {
          const value = await (
            await local('/files/' + id + '/result.json')
          ).json();
          if (!validPlan(value))
            throw Error(
              'The model returned a plan with missing fields or invalid dependencies. Try a narrower brief.',
            );
          setDraft(value);
          setEditing(null);
          draftId.current = crypto.randomUUID();
          setPhase(
            'Draft ready. Edit it below, then submit it for lead approval.',
          );
          return;
        }
      }
      if (alive.current)
        throw Error(
          'The planning wait timed out. The local window retains the run.',
        );
    } finally {
      active.current = null;
    }
  }
  async function save(operation: string, plan?: SharedPlan) {
    const r = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation,
        mission,
        id: plan?.id || draftId.current,
        revision: plan?.revision,
        body: draft,
        brief,
        model: model || 'Human draft',
        feedback: decision,
      }),
    });
    const data = (await r.json()) as { error?: string };
    if (!r.ok) throw Error(data.error);
    await load();
    if (['propose', 'edit'].includes(operation)) {
      setDraft(empty);
      setEditing(null);
      draftId.current = crypto.randomUUID();
    }
    if (operation === 'approve') setBoardVersion((v) => v + 1);
    setPhase(
      operation === 'approve'
        ? 'Approved. Tasks are on the shared board; prerequisites must be accepted before dependent work starts.'
        : 'Saved.',
    );
  }
  return (
    <>
      <section className="plan-panel">
        <h2>From a broad idea to agreed work</h2>
        <p>
          Your local agent can suggest a small plan. The mission lead reviews it
          before tasks enter the shared board. No project work runs
          automatically.
        </p>
        <label>
          What should the next milestone achieve?
          <textarea
            rows={4}
            value={brief}
            maxLength={4000}
            onChange={(e) => setBrief(e.target.value)}
          />
        </label>
        <details>
          <summary>Connect a local agent</summary>
          <p>
            Open the updated local workshop, start it, and copy its pairing
            code.
          </p>
          <label>
            Pairing code
            <input
              type="password"
              autoComplete="off"
              value={code}
              disabled={busy}
              onChange={(e) => {
                setCode(e.target.value.trim());
                setConnected(false);
              }}
            />
          </label>
          <button
            className="secondary"
            disabled={busy || !code}
            onClick={() => act(connect)}
          >
            Connect agent
          </button>
          <label>
            Local model
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {models.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </details>
        <div className="plan-buttons">
          <button
            className="primary"
            disabled={busy || !connected || !model || brief.length < 10}
            onClick={() => act(generate)}
          >
            Ask AI for a work plan
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setEditing(null);
              setDraft({
                summary:
                  'Describe the proposed approach and its first useful milestone.',
                tasks: [
                  {
                    key: 'first-task',
                    module: 'Direction',
                    title: 'Define the first milestone',
                    brief:
                      'Agree the smallest outcome worth building together.',
                    inputs: 'Mission vision',
                    outputs: 'Agreed milestone brief',
                    doneWhen: 'The lead accepts the scope and review criteria.',
                    dependsOn: [],
                    tools: [],
                  },
                ],
              });
              draftId.current = crypto.randomUUID();
            }}
          >
            Write a plan yourself
          </button>
          {active.current && (
            <button
              className="secondary"
              onClick={() =>
                local('/cancel', { id: active.current })
                  .then(() =>
                    setPhase(
                      'Stop requested. Waiting for the local model to finish.',
                    ),
                  )
                  .catch((e) => setError(e.message))
              }
            >
              Stop planning
            </button>
          )}
        </div>
        {phase && <p role="status">{phase}</p>}
        {error && (
          <p role="alert" className="workspace-error">
            {error}
          </p>
        )}
      </section>
      {!!draft.tasks.length && (
        <section className="plan-panel">
          <h2>{editing ? 'Edit proposal' : 'Review your draft'}</h2>
          <label>
            Approach
            <textarea
              rows={3}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />
          </label>
          {draft.tasks.map((task, index) => (
            <div key={index}>
              <TaskEditor
                task={task}
                change={(value) =>
                  setDraft({
                    ...draft,
                    tasks: draft.tasks.map((t, i) => (i === index ? value : t)),
                  })
                }
              />
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  setDraft({
                    ...draft,
                    tasks: draft.tasks.filter((_, i) => i !== index),
                  })
                }
              >
                Remove task
              </button>
            </div>
          ))}
          <p>
            Task keys connect dependencies. Change references when renaming a
            key. A plan can contain up to 12 tasks.
          </p>
          <button
            className="secondary"
            disabled={busy || draft.tasks.length >= 12}
            onClick={() =>
              setDraft({
                ...draft,
                tasks: [
                  ...draft.tasks,
                  {
                    key: 'task-' + (draft.tasks.length + 1),
                    module: '',
                    title: '',
                    brief: '',
                    inputs: '',
                    outputs: '',
                    doneWhen: '',
                    dependsOn: [],
                    tools: [],
                  },
                ],
              })
            }
          >
            Add task
          </button>
          <button
            className="primary"
            disabled={
              busy || !validPlan(draft) || (!editing && !overview.canPropose)
            }
            onClick={() =>
              act(() =>
                save(editing ? 'edit' : 'propose', editing || undefined),
              )
            }
          >
            {editing ? 'Save revised proposal' : 'Submit for lead approval'}
          </button>
          {!validPlan(draft) && (
            <p>
              Complete each task and check that dependencies exist and contain
              no loops.
            </p>
          )}
          {!overview.canPropose && (
            <p>Join or follow this mission before submitting a proposal.</p>
          )}
        </section>
      )}
      <section className="plan-panel">
        <h2>Shared proposals</h2>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => act(load)}
        >
          Refresh proposals
        </button>
        {!overview.plans.length && (
          <p>No shared plans yet. Start with one useful milestone.</p>
        )}
        {overview.canApprove && (
          <label>
            Decision note
            <textarea
              value={decision}
              maxLength={2000}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="Why this plan is ready, or what needs to change"
            />
          </label>
        )}
        {overview.plans.map((plan) => (
          <article className="plan-task" key={plan.id}>
            <span className="eyebrow">
              {plan.status} · revision {plan.revision}
            </span>
            <h3>{plan.body.summary}</h3>
            <p>
              Proposed by {plan.author} · {plan.model}
            </p>
            <ul>
              {plan.body.tasks.map((t) => (
                <li key={t.key}>
                  <strong>
                    {t.module}: {t.title}
                  </strong>
                  <p>{t.brief}</p>
                  <p>Done when: {t.doneWhen}</p>
                  <p>
                    Depends on: {t.dependsOn.join(', ') || 'No prerequisites'} ·
                    Tools: {t.tools.join(', ') || 'None specified'}
                  </p>
                </li>
              ))}
            </ul>
            {plan.feedback && (
              <p>
                Lead decision: {plan.feedback} — {plan.reviewer}
              </p>
            )}
            {plan.head && (
              <a
                className="text-button"
                href={'/missions/' + mission + '/history'}
              >
                View accepted mission history ↗
              </a>
            )}
            {plan.status === 'proposed' && plan.canDecide && (
              <div className="plan-buttons">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    setDraft(plan.body);
                    setEditing(plan);
                    setPhase(
                      'Edit the proposal above, then save before approving.',
                    );
                  }}
                >
                  Edit proposal
                </button>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    decision.trim().length < 5 ||
                    editing?.id === plan.id
                  }
                  onClick={() => act(() => save('approve', plan))}
                >
                  Approve and create tasks
                </button>
                <button
                  className="secondary"
                  disabled={busy || decision.trim().length < 5}
                  onClick={() => act(() => save('reject', plan))}
                >
                  Reject with note
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
      <Actions key={boardVersion} mission={mission} />
    </>
  );
}
