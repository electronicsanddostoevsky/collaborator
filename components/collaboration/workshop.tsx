'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import MissionTools from './mission-tools';
import ContributorRuns from './contributor-runs';
import CodexConnection, { agentLabel } from './codex-connection';
import type { ToolRequirement } from '@/lib/mission-tools';
import {
  validWrittenDraft,
  draftText,
  type WrittenDraft,
} from '@/lib/written-draft';
type Capability = {
  id: string;
  name: string;
  operation: string;
  available: boolean;
  requiresAgent: boolean;
  reason: string;
};
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
type Job = {
  taskId?: string;
  taskRevision?: number;
  inputHead?: string;
  mission?: string;
  tool?: string;
  id: string;
  prompt: string;
  model: string;
  status: string;
  error?: string;
  elapsed?: number;
  parent?: string;
};
type Status = {
  projectInputs?: boolean;
  taskContext?: boolean;
  tools?: Capability[];
  version?: number;
  blender: boolean;
  models: string[];
  problem: string;
  jobs: Job[];
  active: string | null;
};
type Shared = {
  tool?: string;
  action_id?: string | null;
  canAccept?: boolean;
  id: string;
  prompt: string;
  model: string;
  status: string;
  author: string;
  hasPreview: number;
  feedback: string;
  reviewer: string | null;
};
const endpoint = 'http://127.0.0.1:8765';
const initial =
  'Make a rough two-wheeled wooden chariot with an open platform, front rail, and long forward pole. Use simple wooden shapes and bronze-colored wheel rims. This is a visual exploration, not a historically verified reconstruction.';
const labels: Record<string, string> = {
  running: 'Reading from the connected API',
  queued: 'Waiting to begin',
  planning: 'Agent is preparing the draft',
  rendering: 'Rendering in Blender',
  ready: 'Ready to review',
  failed: 'Run needs attention',
  stopped: 'Run stopped',
  shared: 'Awaiting review',
  accepted: 'Accepted',
  changes_requested: 'Changes requested',
};
async function result<T>(r: Response): Promise<T> {
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw Error(d.error || 'The request could not be completed.');
  return d;
}
function Review({
  mission,
  item,
  canAccept,
  busy,
  decide,
  revise,
}: {
  mission: string;
  item: Shared;
  canAccept: boolean;
  busy: boolean;
  decide: (id: string, action: string, note: string) => void;
  revise?: () => void;
}) {
  const [note, setNote] = useState('');
  const [written, setWritten] = useState<WrittenDraft | null>(null),
    [readError, setReadError] = useState('');
  return (
    <article className="ws-shared">
      <div className="update-meta">
        <strong>{labels[item.status] || item.status}</strong>
        <span>{item.author}</span>
      </div>
      {item.status === 'changes_requested' && revise && (
        <button className="secondary" onClick={revise}>
          Use feedback for the next iteration
        </button>
      )}
      {!!item.hasPreview && (
        <img
          src={
            '/api/workshop?mission=' +
            encodeURIComponent(mission) +
            '&id=' +
            item.id +
            '&preview=1'
          }
          alt="Contributor’s Blender preview"
          loading="lazy"
        />
      )}
      <p className="post-body">{item.prompt}</p>
      {item.tool === 'mission-writer' && (
        <div>
          <button
            className="text-button"
            onClick={async () => {
              try {
                setReadError('');
                const response = await fetch(
                  '/api/workshop?' +
                    new URLSearchParams({ mission, id: item.id, read: '1' }),
                );
                const value = await result<{ draft: WrittenDraft }>(response);
                setWritten(value.draft);
              } catch (e) {
                setReadError(
                  e instanceof Error ? e.message : 'Could not read draft.',
                );
              }
            }}
          >
            Read the written contribution
          </button>
          {readError && <p role="alert">{readError}</p>}
          {written && <pre className="written-draft">{draftText(written)}</pre>}
        </div>
      )}
      <p className="workspace-status">
        {item.model} · {item.id.slice(0, 8)}
      </p>
      <a
        className="text-button"
        href={
          '/api/workshop?mission=' +
          encodeURIComponent(mission) +
          '&id=' +
          item.id
        }
      >
        Download editable result ↗
      </a>
      {item.feedback && (
        <blockquote>
          <strong>{item.reviewer}</strong>
          <p>{item.feedback}</p>
        </blockquote>
      )}
      {item.action_id && (
        <a className="text-button" href={'/missions/' + mission + '/plan'}>
          Linked task and review history ↗
        </a>
      )}
      {item.action_id && item.status === 'changes_requested' && (
        <a
          className="text-button"
          href={'/missions/' + mission + '/workshop?task=' + item.action_id}
        >
          Open task for its next iteration ↗
        </a>
      )}
      {canAccept && item.status === 'shared' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            decide(item.id, 'accept', note);
          }}
        >
          <label>
            Review note
            <textarea
              required
              minLength={5}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What works, or what needs to change?"
            />
          </label>
          <div className="action-buttons">
            <button
              className="primary"
              disabled={busy || note.trim().length < 5}
            >
              Accept into mission
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy || note.trim().length < 5}
              onClick={() => decide(item.id, 'revise', note)}
            >
              Request changes
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
export default function Workshop({
  mission = 'mahabharata',
  taskId,
}: {
  mission?: string;
  taskId?: string;
}) {
  type TaskContext = {
    id: string;
    title: string;
    revision: number;
    inputHead: string;
    snapshot: { head: string; files: Record<string, string> };
    inputs: string;
    outputs: string;
    feedback: string;
    prompt: string;
    tools: string[];
  };
  const [taskContext, setTaskContext] = useState<TaskContext | null>(null);
  const [cloudConsent, setCloudConsent] = useState(false);
  const readTask = useCallback(async () => {
    if (!taskId) return null;
    const value = await result<TaskContext>(
      await fetch(
        '/api/task-context?mission=' +
          encodeURIComponent(mission) +
          '&task=' +
          encodeURIComponent(taskId),
        { cache: 'no-store' },
      ),
    );
    setTaskContext(value);
    return value;
  }, [mission, taskId]);
  const [requirements, setRequirements] = useState<ToolRequirement[]>([]),
    [tool, setTool] = useState(''),
    [apiId, setApiId] = useState(''),
    [apiName, setApiName] = useState(''),
    [apiUrl, setApiUrl] = useState(''),
    [apiToken, setApiToken] = useState(''),
    [textPreview, setTextPreview] = useState('');
  const [code, setCode] = useState(''),
    [connected, setConnected] = useState(false),
    [status, setStatus] = useState<Status | null>(null),
    [model, setModel] = useState(''),
    [prompt, setPrompt] = useState(
      mission === 'mahabharata'
        ? initial
        : 'Describe what this mission needs from the selected tool.',
    ),
    [parent, setParent] = useState(''),
    [selected, setSelected] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [shared, setShared] = useState<Shared[]>([]),
    [canAccept, setCanAccept] = useState(false),
    [preview, setPreview] = useState(''),
    [previewError, setPreviewError] = useState('');
  const runId = useRef<string | null>(null),
    generation = useRef(0),
    brief = useRef<HTMLTextAreaElement>(null);
  const job = status?.jobs.find((j) => j.id === selected),
    sharedJob = shared.find((j) => j.id === selected);
  const request = useCallback(
    async <T,>(path: string, body?: unknown): Promise<T> =>
      result<T>(
        await fetch(endpoint + path, {
          method: body ? 'POST' : 'GET',
          headers: {
            Authorization: 'Bearer ' + code,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(10000),
        }),
      ),
    [code],
  );
  const refresh = useCallback(async () => {
    const stamp = generation.current;
    const d = await request<Status>('/status');
    if (stamp !== generation.current) return;
    d.jobs = d.jobs.filter(
      (j) =>
        (j.mission || 'mahabharata') === mission &&
        j.tool !== 'mission-planner' &&
        (!taskId || j.taskId === taskId),
    );
    setStatus(d);
    setConnected(true);
    setModel((m) => (d.models.includes(m) ? m : d.models[0] || ''));
    setSelected((s) =>
      d.jobs.some((j) => j.id === s) ? s : d.jobs[0]?.id || '',
    );
  }, [request, mission, taskId]);
  const loadShared = useCallback(async () => {
    const d = await result<{ artifacts: Shared[]; canAccept: boolean }>(
      await fetch('/api/workshop?mission=' + encodeURIComponent(mission) + '', {
        cache: 'no-store',
      }),
    );
    setShared(d.artifacts.filter((a) => !taskId || a.action_id === taskId));
    setCanAccept(d.canAccept);
  }, [mission, taskId]);
  useEffect(() => {
    loadShared().catch((e) => setError(e.message));
  }, [loadShared]);
  useEffect(() => {
    readTask()
      .then((t) => {
        if (t) setPrompt(t.prompt);
      })
      .catch((e) => setError(e.message));
  }, [readTask]);
  useEffect(() => {
    if (!connected) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        await refresh();
      } catch {
        if (!disposed) {
          generation.current++;
          setConnected(false);
          setError(
            'The workshop disconnected. Reconnect with its current pairing code; your files are retained.',
          );
        }
      }
      if (!disposed) timer = setTimeout(tick, 4000);
    }
    timer = setTimeout(tick, 4000);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [connected, refresh]);
  useEffect(() => {
    setPreview('');
    setTextPreview('');
    setPreviewError('');
    if (!connected || job?.status !== 'ready') return;
    let disposed = false,
      url = '';
    const isApi = (job.tool || 'blender') !== 'blender';
    fetch(
      endpoint + '/files/' + job.id + (isApi ? '/result.json' : '/preview.png'),
      {
        headers: { Authorization: 'Bearer ' + code },
        signal: AbortSignal.timeout(15000),
      },
    )
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            'The preview is unavailable. Reconnect or download the result from the local workshop.',
          );
        return r.blob();
      })
      .then((blob) => {
        if (isApi) {
          blob.text().then((t) => {
            if (!disposed) {
              let readable = t;
              if (job.tool === 'mission-writer') {
                try {
                  const draft = JSON.parse(t);
                  if (validWrittenDraft(draft)) readable = draftText(draft);
                } catch {}
              }
              setTextPreview(readable.slice(0, 12000));
            }
          });
          return;
        }
        if (!disposed) {
          url = URL.createObjectURL(blob);
          setPreview(url);
        }
      })
      .catch((e) => {
        if (!disposed) setPreviewError(e.message);
      });
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [connected, code, job?.id, job?.status]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not complete this action.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function localFile(id: string, name: string) {
    const r = await fetch(endpoint + '/files/' + id + '/' + name, {
      headers: { Authorization: 'Bearer ' + code },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw Error(
        'Result unavailable or over the 10 MB transfer limit. Your original remains in the workshop folder.',
      );
    return r.blob();
  }
  async function share() {
    if (!job) return;
    if (taskId && job.taskId !== taskId)
      throw Error(
        'Choose a run made for this task. Older free experiments cannot be attached as task work.',
      );
    const q = new URLSearchParams({
      mission,
      id: job.id,
      prompt: job.prompt,
      model: job.model,
    });
    if (job.tool) q.set('tool', job.tool);
    if (job.taskId) {
      q.set('taskId', job.taskId);
      q.set('taskRevision', String(job.taskRevision));
      q.set('inputHead', job.inputHead || '');
    }
    if (!sharedJob)
      await result(
        await fetch('/api/workshop?' + q, {
          method: 'POST',
          body: await localFile(
            job.id,
            job.tool === 'mission-writer' ? 'result.json' : 'artifact.zip',
          ),
        }),
      );
    if ((job.tool || 'blender') !== 'blender') {
      await loadShared();
      setNotice('Result shared with the mission for review.');
      return;
    }
    try {
      await result(
        await fetch(
          '/api/workshop?mission=' +
            encodeURIComponent(mission) +
            '&action=preview&id=' +
            job.id,
          { method: 'POST', body: await localFile(job.id, 'preview.png') },
        ),
      );
      setNotice(
        'Result and preview shared. The maintainer can now review them.',
      );
    } catch {
      throw Error(
        'The editable result was shared, but its preview did not upload. Use Share preview to retry before review.',
      );
    } finally {
      await loadShared();
    }
  }
  function revise(j: Job) {
    setTool(j.tool || 'blender');
    setParent(j.id);
    setPrompt(
      j.tool === 'mission-writer'
        ? 'Revise this written draft: '
        : 'Change this scene: ',
    );
    runId.current = null;
    brief.current?.focus();
    brief.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const selectedTool = status?.tools?.find((t) => t.id === tool);
  const availableChoices = [
    ...requirements.filter((r) => r.id !== 'mission-writer'),
    {
      id: 'mission-writer',
      name: 'Written contribution',
      purpose: 'Create a useful written draft with your agent.',
    },
  ];
  const ready =
    connected &&
    (status?.version || 0) >= 4 &&
    !!selectedTool?.available &&
    availableChoices.some((r) => r.id === tool) &&
    (!selectedTool.requiresAgent || !!model);
  useEffect(() => {
    setTool((t) => {
      const choices = [...requirements.map((r) => r.id), 'mission-writer'];
      const approved = taskContext?.tools.length
        ? choices.filter((id) => taskContext.tools.includes(id))
        : choices;
      return approved.includes(t) ? t : approved[0] || '';
    });
  }, [requirements, taskContext?.tools]);
  return (
    <>
      {taskId && (
        <section className="plan-panel">
          <h2>{taskContext?.title || 'Loading task context'}</h2>
          <p>
            This run will be linked to the task and its recorded mission
            snapshot. Sharing a result sends the task for review.
          </p>
          {taskContext && (
            <>
              <p>
                Task revision {taskContext.revision} · Required tools:{' '}
                {taskContext.tools.join(', ') ||
                  'Choose a suitable mission tool'}
              </p>
              <details>
                <summary>Project context for this run</summary>
                <p>
                  The complete text snapshot is saved with your local result.
                  The model receives bounded excerpts; binary assets are not
                  downloaded or imported.
                </p>
                <p>
                  {Object.keys(taskContext.snapshot.files).length} text files ·{' '}
                  {taskContext.inputHead.slice(0, 8)}
                </p>
                {taskContext.inputs && (
                  <p>
                    <strong>Inputs:</strong> {taskContext.inputs}
                  </p>
                )}
                {taskContext.outputs && (
                  <p>
                    <strong>Expected output:</strong> {taskContext.outputs}
                  </p>
                )}
                {taskContext.feedback && (
                  <blockquote>
                    <strong>Latest review</strong>
                    <p>{taskContext.feedback}</p>
                  </blockquote>
                )}
              </details>
            </>
          )}
          <a className="text-button" href={'/missions/' + mission + '/plan'}>
            Return to the task board ↗
          </a>
        </section>
      )}
      <MissionTools mission={mission} onChange={setRequirements} />
      <div className="ws-statusbar">
        <span className={ready ? 'ws-indicator online' : 'ws-indicator'} />
        <strong>
          {ready
            ? 'Your computer is ready'
            : connected
              ? 'Finish workshop setup'
              : 'Connect your local workshop'}
        </strong>
        <span>Mission tools · local connections</span>
        <a href="/platform-history">What’s next ↗</a>
      </div>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="workspace-status" role="status">
          {notice}
        </p>
      )}
      <ContributorRuns
        mission={mission}
        jobs={status?.jobs || []}
        connected={connected}
      />
      <p className="field-note">
        <a className="text-button" href={'/missions/' + mission + '/team'}>
          Join this mission’s community ↗
        </a>{' '}
        ·{' '}
        <a className="text-button" href="/pilot">
          Setup and recovery guide ↗
        </a>
      </p>
      <div className="ws-layout">
        <section className="ws-main">
          <form
            className="ws-brief"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const context = await readTask();
                if (context && (!status?.taskContext || !status?.projectInputs))
                  throw Error(
                    'Restart with the updated workshop download to support task-linked runs.',
                  );
                if (context?.tools.length && !context.tools.includes(tool))
                  throw Error('Select one of this task’s approved tools.');
                runId.current ??= crypto.randomUUID();
                await result(
                  await fetch('/api/runs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      operation: 'begin',
                      id: runId.current,
                      mission,
                      tool,
                      model: selectedTool?.requiresAgent
                        ? model
                        : 'No agent — fixed API request',
                      taskId: context?.id,
                      taskRevision: context?.revision,
                    }),
                  }),
                );
                const j = await request<Job>('/run', {
                  id: runId.current,
                  prompt,
                  model,
                  cloudConsent,
                  mission,
                  tool,
                  parent,
                  ...(context
                    ? {
                        taskId: context.id,
                        taskRevision: context.revision,
                        inputHead: context.inputHead,
                        snapshot: context.snapshot,
                      }
                    : {}),
                });
                setSelected(j.id);
                setCloudConsent(false);
                runId.current = null;
                await refresh();
                setNotice(
                  'Your chosen agent is working. Each iteration keeps its own files.',
                );
              });
            }}
          >
            <span className="eyebrow">01 / DIRECT</span>
            <h2>
              {parent ? 'Shape the next iteration' : 'What should we make?'}
            </h2>
            <label htmlFor="creative-brief">Your creative brief</label>
            <textarea
              id="creative-brief"
              ref={brief}
              required
              minLength={10}
              maxLength={3000}
              rows={5}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                runId.current = null;
              }}
            />
            {parent && (
              <p className="workspace-status">
                Based on {parent.slice(0, 8)}.{' '}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setParent('');
                    runId.current = null;
                  }}
                >
                  Start fresh instead
                </button>
              </p>
            )}
            <div className="ws-run-controls">
              <label>
                Mission tool
                <Select
                  value={tool || null}
                  onValueChange={(v) => {
                    setTool(String(v));
                    setParent('');
                    runId.current = null;
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add a mission requirement" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChoices.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {selectedTool?.requiresAgent && (
                <label>
                  Agent model
                  <Select
                    value={model || null}
                    disabled={!connected || busy}
                    onValueChange={(v) => {
                      setModel(String(v));
                      setCloudConsent(false);
                      runId.current = null;
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Connect to choose a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {status?.models.map((m) => (
                        <SelectItem key={m} value={m}>
                          {agentLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )}
              <button
                className="primary"
                disabled={
                  !ready ||
                  busy ||
                  !!status?.active ||
                  (model.startsWith('codex:') && !cloudConsent)
                }
              >
                {status?.active
                  ? 'Working on your draft…'
                  : selectedTool?.requiresAgent
                    ? 'Ask the agent to make a draft ↗'
                    : 'Run the connected operation ↗'}
              </button>
            </div>
            {model.startsWith('codex:') && (
              <label>
                <input
                  type="checkbox"
                  checked={cloudConsent}
                  onChange={(e) => setCloudConsent(e.target.checked)}
                />{' '}
                Send this run’s brief and project reference excerpts to Codex
                using my ChatGPT allowance. Local tools remain controlled by the
                workshop.
              </label>
            )}
            <p className="workspace-status">
              {selectedTool?.requiresAgent
                ? tool === 'mission-writer'
                  ? 'Your agent creates a written draft from the brief and supplied context. Review facts and assumptions before sharing. No web research or external actions run automatically.'
                  : 'Your selected agent proposes a draft. Blender creates rough 3D blockouts locally, with an eight-minute limit.'
                : selectedTool
                  ? 'One GET request to your configured endpoint. The brief is a run note; it does not change the request. Responses are limited to 1 MB and 30 seconds.'
                  : 'Connect this computer and configure an adapter for the selected requirement.'}
              {selectedTool && !selectedTool.available && selectedTool.reason}
            </p>
          </form>
          <section className="ws-result">
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / REVIEW</span>
                <h2>
                  {job
                    ? labels[job.status] || job.status
                    : 'Your preview will appear here'}
                </h2>
              </div>
              {job?.elapsed && (
                <span className="small-label">{job.elapsed}s</span>
              )}
            </div>
            {textPreview ? (
              <pre className="ws-api-result">
                {textPreview}
                {textPreview.length >= 12000
                  ? '\n… Download the bundle for the complete response.'
                  : ''}
              </pre>
            ) : preview ? (
              <img
                className="ws-render"
                src={preview}
                alt="Rendered Blender artifact from the selected local run"
              />
            ) : (
              <div className="ws-preview-empty">
                <strong>
                  {job?.status === 'planning'
                    ? 'Your agent is preparing the contribution'
                    : job?.status === 'rendering'
                      ? 'Blender is rendering your draft'
                      : job?.status === 'ready'
                        ? 'Loading your preview…'
                        : 'A brief becomes a first draft.'}
                </strong>
                <p>
                  {previewError ||
                    job?.error ||
                    (job
                      ? 'Select another iteration or refine your brief.'
                      : 'Describe a useful outcome, connect your computer, and make your first draft.')}
                </p>
              </div>
            )}
            {job && (
              <>
                <p className="post-body">{job.prompt}</p>
                <p className="workspace-status">
                  {job.model} · {job.id.slice(0, 8)}
                  {job.parent ? ' · based on ' + job.parent.slice(0, 8) : ''}
                </p>
                <div className="action-buttons">
                  {job.status === 'ready' && (
                    <>
                      {(job.tool || 'blender') === 'blender' && (
                        <button
                          className="secondary"
                          onClick={() => revise(job)}
                        >
                          Request changes
                        </button>
                      )}
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            const url = URL.createObjectURL(
                              await localFile(job.id, 'artifact.zip'),
                            );
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'workshop-' + job.id + '.zip';
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 30000);
                          })
                        }
                      >
                        Download result bundle
                      </button>
                      {(!sharedJob ||
                        ((job.tool || 'blender') === 'blender' &&
                          !sharedJob.hasPreview &&
                          sharedJob.status === 'shared')) && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => act(share)}
                        >
                          {sharedJob ? 'Share preview' : 'Share with mission'}
                        </button>
                      )}
                      {sharedJob && (
                        <span className="workspace-status">
                          {labels[sharedJob.status]}
                        </span>
                      )}
                    </>
                  )}
                  {['failed', 'stopped'].includes(job.status) && (
                    <button
                      className="secondary"
                      onClick={() => {
                        setPrompt(job.prompt);
                        setParent(job.parent || '');
                        runId.current = null;
                        brief.current?.focus();
                      }}
                    >
                      Use this brief again
                    </button>
                  )}
                  {status?.active === job.id && (
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await request('/cancel', { id: job.id });
                          setNotice(
                            'Stop requested. Rendering stops promptly; an in-flight model request may take up to four minutes to finish.',
                          );
                          await refresh();
                        })
                      }
                    >
                      Stop this run
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </section>
        <aside className="ws-sidebar">
          {connected && <CodexConnection request={request} changed={refresh} />}
          <details className="ws-connection" open={!connected}>
            <summary>
              {connected ? 'Workshop connected' : 'Connect your computer'}
            </summary>
            <p>
              Open Start workshop on this PC, allow access, then use Copy
              pairing code in the local window and paste it here.
            </p>
            <label>
              Pairing code
              <input
                type="password"
                autoComplete="off"
                value={code}
                disabled={connected}
                onChange={(e) => setCode(e.target.value.trim())}
              />
            </label>
            <button
              className="secondary"
              disabled={busy || !code}
              onClick={() =>
                connected
                  ? (generation.current++,
                    setConnected(false),
                    setCode(''),
                    setStatus(null))
                  : act(refresh)
              }
            >
              {connected ? 'Disconnect' : 'Connect workshop'}
            </button>
            {status && (
              <p className="workspace-status">
                Available operations:{' '}
                {status.tools?.filter((t) => t.available).length || 0}. Agent
                models: {status.models.length}. {status.problem}
                {(status.version || 0) < 5
                  ? ' Restart with the updated workshop download to enable this version.'
                  : ''}
              </p>
            )}
            <details>
              <summary>Installation help</summary>
              <ol>
                <li>
                  <a href="/workshop/Collaborator-Workshop.zip" download>
                    Download and extract the workshop
                  </a>
                  .
                </li>
                <li>
                  Install Python for the companion. Add only the tools this
                  mission needs. The bundled helper installs Blender and Ollama
                  for the Mahabharata workflow.
                </li>
                <li>
                  Double-click Start workshop, allow tool access, and choose
                  Start workshop in the window. Copy its pairing code here.
                  Allow local-network access if your browser asks.
                </li>
              </ol>
              <p>
                Keep the local window open while working. After restarting it,
                reconnect with its new code; your saved work is retained. Stop
                workshop ends local access. If an embedded browser blocks
                connection, use a regular browser.
              </p>
            </details>
          </details>
          {connected && (
            <details className="ws-connection">
              <summary>Connect an HTTP API</summary>
              <p>
                Configure a fixed, read-only JSON endpoint on this PC. Use the
                same connection ID as the mission requirement. The agent cannot
                change the URL or perform writes.
              </p>
              <form
                className="update-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    await request('/connectors', {
                      id: apiId,
                      name: apiName,
                      url: apiUrl,
                      token: apiToken,
                    });
                    setApiToken('');
                    setApiUrl('');
                    setApiId('');
                    setApiName('');
                    await refresh();
                    setNotice('API connection saved on this computer.');
                  });
                }}
              >
                <label>
                  Connection ID
                  <input
                    required
                    pattern="[a-z][a-z0-9-]{1,39}"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                  />
                </label>
                <label>
                  Name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                  />
                </label>
                <label>
                  Exact JSON endpoint
                  <input
                    required
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://service.example/api/data"
                  />
                </label>
                <label>
                  Bearer token (optional)
                  <input
                    type="password"
                    autoComplete="off"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                  />
                </label>
                <p>
                  Credentials are saved in the companion’s local configuration
                  file. They are not uploaded to the platform. Only share
                  returned data you intend the mission to see.
                </p>
                <button className="secondary" disabled={busy}>
                  Save local connection
                </button>
              </form>
            </details>
          )}
          <section className="ws-iterations">
            <div className="section-heading">
              <h2>Iterations</h2>
              <span className="small-label">{status?.jobs.length || 0}</span>
            </div>
            {!status?.jobs.length && (
              <p>
                Local runs appear after connecting. Shared results remain below.
              </p>
            )}
            {status?.jobs.map((j, i) => (
              <button
                className={
                  'ws-iteration ' + (selected === j.id ? 'selected' : '')
                }
                key={j.id}
                aria-pressed={selected === j.id}
                onClick={() => setSelected(j.id)}
              >
                <span>
                  {labels[j.status] || j.status} · {j.id.slice(0, 8)}
                </span>
                <strong>{j.prompt}</strong>
                {j.parent && <small>Revision of {j.parent.slice(0, 8)}</small>}
              </button>
            ))}
          </section>
        </aside>
      </div>
      <section className="ws-community">
        <div className="section-heading">
          <div>
            <span className="eyebrow">03 / BUILD TOGETHER</span>
            <h2>Shared with the mission</h2>
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => act(loadShared)}
          >
            Refresh
          </button>
        </div>
        <p>
          Share a draft for feedback. Acceptance records its reference and
          review in mission history.
        </p>
        {shared.length === 0 ? (
          <p className="update-empty">
            No shared workshop results yet. Your local iterations stay on your
            computer until you share them.
          </p>
        ) : (
          <div className="ws-shared-grid">
            {shared.map((item) => (
              <Review
                mission={mission}
                key={item.id}
                item={item}
                canAccept={canAccept || !!item.canAccept}
                busy={busy}
                revise={
                  (!item.action_id || item.action_id === taskId) &&
                  status?.jobs.some(
                    (j) =>
                      j.id === item.id && (j.tool || 'blender') === 'blender',
                  )
                    ? () => {
                        const original = status!.jobs.find(
                          (j) => j.id === item.id,
                        )!;
                        revise(original);
                        setPrompt(item.feedback);
                      }
                    : undefined
                }
                decide={(id, action, feedback) =>
                  act(async () => {
                    await result(
                      await fetch(
                        '/api/workshop?mission=' +
                          encodeURIComponent(mission) +
                          '&action=' +
                          action +
                          '&id=' +
                          id,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ feedback }),
                        },
                      ),
                    );
                    await loadShared();
                    setNotice(
                      action === 'accept'
                        ? 'Accepted and recorded in mission history.'
                        : 'Feedback recorded. The contributor can share a new iteration.',
                    );
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
