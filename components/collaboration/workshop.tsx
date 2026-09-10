'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
type Job = {
  id: string;
  prompt: string;
  model: string;
  status: string;
  error?: string;
  elapsed?: number;
  parent?: string;
};
type Status = {
  version?: number;
  blender: boolean;
  models: string[];
  problem: string;
  jobs: Job[];
  active: string | null;
};
type Shared = {
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
  queued: 'Waiting to begin',
  planning: 'Planning the scene',
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
  item,
  canAccept,
  busy,
  decide,
}: {
  item: Shared;
  canAccept: boolean;
  busy: boolean;
  decide: (id: string, action: string, note: string) => void;
}) {
  const [note, setNote] = useState('');
  return (
    <article className="ws-shared">
      <div className="update-meta">
        <strong>{labels[item.status] || item.status}</strong>
        <span>{item.author}</span>
      </div>
      {!!item.hasPreview && (
        <img
          src={'/api/workshop?mission=mahabharata&id=' + item.id + '&preview=1'}
          alt="Contributor’s Blender preview"
          loading="lazy"
        />
      )}
      <p className="post-body">{item.prompt}</p>
      <p className="workspace-status">
        {item.model} · {item.id.slice(0, 8)}
      </p>
      <a
        className="text-button"
        href={'/api/workshop?mission=mahabharata&id=' + item.id}
      >
        Download editable result ↗
      </a>
      {item.feedback && (
        <blockquote>
          <strong>{item.reviewer}</strong>
          <p>{item.feedback}</p>
        </blockquote>
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
export default function Workshop() {
  const [code, setCode] = useState(''),
    [connected, setConnected] = useState(false),
    [status, setStatus] = useState<Status | null>(null),
    [model, setModel] = useState(''),
    [prompt, setPrompt] = useState(initial),
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
    setStatus(d);
    setConnected(true);
    setModel((m) => (d.models.includes(m) ? m : d.models[0] || ''));
    setSelected((s) =>
      d.jobs.some((j) => j.id === s) ? s : d.jobs[0]?.id || '',
    );
  }, [request]);
  const loadShared = useCallback(async () => {
    const d = await result<{ artifacts: Shared[]; canAccept: boolean }>(
      await fetch('/api/workshop?mission=mahabharata', { cache: 'no-store' }),
    );
    setShared(d.artifacts);
    setCanAccept(d.canAccept);
  }, []);
  useEffect(() => {
    loadShared().catch((e) => setError(e.message));
  }, [loadShared]);
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
    setPreviewError('');
    if (!connected || job?.status !== 'ready') return;
    let disposed = false,
      url = '';
    fetch(endpoint + '/files/' + job.id + '/preview.png', {
      headers: { Authorization: 'Bearer ' + code },
      signal: AbortSignal.timeout(15000),
    })
      .then(async (r) => {
        if (!r.ok)
          throw Error(
            'The preview is unavailable. Reconnect or download the result from the local workshop.',
          );
        return r.blob();
      })
      .then((blob) => {
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
    const q = new URLSearchParams({
      mission: 'mahabharata',
      id: job.id,
      prompt: job.prompt,
      model: job.model,
    });
    if (!sharedJob)
      await result(
        await fetch('/api/workshop?' + q, {
          method: 'POST',
          body: await localFile(job.id, 'artifact.zip'),
        }),
      );
    try {
      await result(
        await fetch(
          '/api/workshop?mission=mahabharata&action=preview&id=' + job.id,
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
    setParent(j.id);
    setPrompt('Change this scene: ');
    runId.current = null;
    brief.current?.focus();
    brief.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const ready = connected && status?.version === 2 && status.blender && !!model;
  return (
    <>
      <div className="ws-statusbar">
        <span className={ready ? 'ws-indicator online' : 'ws-indicator'} />
        <strong>
          {ready
            ? 'Your computer is ready'
            : connected
              ? 'Finish workshop setup'
              : 'Connect your local workshop'}
        </strong>
        <span>Blender + Ollama · local compute</span>
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
      <div className="ws-layout">
        <section className="ws-main">
          <form
            className="ws-brief"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                runId.current ??= crypto.randomUUID();
                const j = await request<Job>('/run', {
                  id: runId.current,
                  prompt,
                  model,
                  parent,
                });
                setSelected(j.id);
                runId.current = null;
                await refresh();
                setNotice(
                  'Your local model is working. Each iteration keeps its own files.',
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
                Local model
                <Select
                  value={model || null}
                  disabled={!connected || busy}
                  onValueChange={(v) => {
                    setModel(String(v));
                    runId.current = null;
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Connect to choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {status?.models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <button
                className="primary"
                disabled={!ready || busy || !!status?.active}
              >
                {status?.active
                  ? 'Working on your draft…'
                  : 'Make a Blender draft ↗'}
              </button>
            </div>
            <p className="workspace-status">
              One local run · up to 8 minutes · no paid API. Creates simple 3D
              blockouts, not finished game assets.
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
            {preview ? (
              <img
                className="ws-render"
                src={preview}
                alt="Rendered Blender artifact from the selected local run"
              />
            ) : (
              <div className="ws-preview-empty">
                <strong>
                  {job?.status === 'planning'
                    ? 'Your model is arranging the scene'
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
                      : 'Describe an object, connect your computer, and make your first draft.')}
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
                      <button className="secondary" onClick={() => revise(job)}>
                        Request changes
                      </button>
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
                        Download .blend bundle
                      </button>
                      {(!sharedJob ||
                        (!sharedJob.hasPreview &&
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
          <details className="ws-connection" open={!connected}>
            <summary>
              {connected ? 'Workshop connected' : 'Connect your computer'}
            </summary>
            <p>
              Start the workshop on this PC, then enter its temporary pairing
              code.
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
                Blender: {status.blender ? 'ready' : 'not found'}. Models:{' '}
                {status.models.length}. {status.problem}
                {status.version !== 2
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
                  Use the included installation helper for Blender, Ollama, and
                  Python, then download a local model.
                </li>
                <li>
                  Double-click Start workshop and copy its code here. Allow
                  local-network access if your browser asks.
                </li>
              </ol>
              <p>
                Already installed on this PC? Start the existing workshop. If an
                embedded browser blocks connection, use a regular browser.
              </p>
            </details>
          </details>
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
                key={item.id}
                item={item}
                canAccept={canAccept}
                busy={busy}
                decide={(id, action, feedback) =>
                  act(async () => {
                    await result(
                      await fetch(
                        '/api/workshop?mission=mahabharata&action=' +
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
