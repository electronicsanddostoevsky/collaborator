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
};
const local = 'http://127.0.0.1:8765';
export default function Workshop() {
  const [code, setCode] = useState(''),
    [connected, setConnected] = useState(false),
    [status, setStatus] = useState<Status | null>(null),
    [model, setModel] = useState(''),
    [prompt, setPrompt] = useState(
      'Make a rough two-wheeled chariot with an open platform, a front rail, and a long pole. Use simple wooden shapes and bronze-colored wheel rims. This is a visual exploration, not a historically verified reconstruction.',
    ),
    [parent, setParent] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [shared, setShared] = useState<Shared[]>([]),
    [canAccept, setCanAccept] = useState(false),
    [previews, setPreviews] = useState<Record<string, string>>({});
  const urls = useRef<string[]>([]),
    runId = useRef<string | null>(null);
  const request = useCallback(
    async (path: string, body?: unknown) => {
      const r = await fetch(local + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: 'Bearer ' + code,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      });
      const d = (await r.json()) as Status & {
        error: string;
        artifacts: Shared[];
        canAccept: boolean;
      };
      if (!r.ok) throw Error(d.error);
      return d;
    },
    [code],
  );
  const refresh = useCallback(async () => {
    const d = (await request('/status')) as Status;
    setStatus(d);
    setConnected(true);
    setModel((m) => (d.models.includes(m) ? m : d.models[0] || ''));
  }, [request]);
  const loadShared = useCallback(async () => {
    const r = await fetch('/api/workshop?mission=mahabharata', {
      cache: 'no-store',
    });
    const d = (await r.json()) as Status & {
      error: string;
      artifacts: Shared[];
      canAccept: boolean;
    };
    if (!r.ok) throw Error(d.error);
    setShared(d.artifacts);
    setCanAccept(d.canAccept);
  }, []);
  useEffect(() => {
    loadShared().catch((e) => setError(e.message));
    return () => urls.current.forEach(URL.revokeObjectURL);
  }, [loadShared]);
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(
      () =>
        refresh().catch(() => {
          setConnected(false);
          setError(
            'Workshop disconnected. Reopen it and reconnect. Local runs are retained.',
          );
        }),
      4000,
    );
    return () => clearInterval(timer);
  }, [connected, refresh]);
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
  async function localFile(job: Job, name: string) {
    const r = await fetch(local + '/files/' + job.id + '/' + name, {
      headers: { Authorization: 'Bearer ' + code },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw Error(
        'Result unavailable or exceeds the 10 MB limit. The original remains in your workshop folder.',
      );
    return r.blob();
  }
  return (
    <>
      <section className="aside-card workshop-connect">
        <div className="section-heading">
          <h2>
            {connected ? 'Your workshop is connected' : 'Connect your computer'}
          </h2>
          <span className="small-label">
            {connected ? 'LOCAL COMPUTE' : 'ONE-TIME SETUP'}
          </span>
        </div>
        <p>
          Blender makes the file. Ollama runs your installed model. No paid
          inference API is called; your computer supplies the time, memory, and
          electricity.
        </p>
        <p>
          <a
            className="text-button"
            href="/workshop/Collaborator-Workshop.zip"
            download
          >
            Download the Windows workshop & installation helper ↗
          </a>
        </p>
        <details>
          <summary>Install & start the workshop</summary>
          <ol className="workshop-steps">
            <li>
              Install{' '}
              <a
                href="https://www.blender.org/download/"
                target="_blank"
                rel="noreferrer"
              >
                Blender
              </a>
              ,{' '}
              <a
                href="https://ollama.com/download/windows"
                target="_blank"
                rel="noreferrer"
              >
                Ollama
              </a>
              , and{' '}
              <a
                href="https://www.python.org/downloads/"
                target="_blank"
                rel="noreferrer"
              >
                Python 3.10 or newer
              </a>
              .
            </li>
            <li>
              In Ollama, download a local model that fits your computer. Cloud
              models are not supported by this connector.
            </li>
            <li>
              <a href="/workshop/Collaborator-Workshop.zip" download>
                Download the workshop
              </a>
              , extract it, and double-click <strong>Start workshop</strong>.
              Keep its window open.
            </li>
            <li>
              Copy its pairing code below. If your browser asks to connect to a
              local device, allow this workshop. Some embedded browsers may
              require opening Collaborator in a regular browser.
            </li>
          </ol>
          <p>
            The connector listens only on this computer. It accepts requests
            from this site with the temporary pairing code. Closing it
            disconnects the workshop.
          </p>
        </details>
        <div className="workshop-pair">
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
                ? (setConnected(false), setCode(''), setStatus(null))
                : act(refresh)
            }
          >
            {connected ? 'Disconnect' : 'Connect workshop'}
          </button>
        </div>
        {status && (
          <p className="workspace-status">
            Blender:{' '}
            {status.blender
              ? 'ready'
              : 'not found — install it, then reconnect'}{' '}
            · Local models: {status.models.length || 'none found'}.{' '}
            {status.problem}
          </p>
        )}
      </section>
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
      <form
        className="update-composer"
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            runId.current ??= crypto.randomUUID();
            await request('/run', { id: runId.current, prompt, model, parent });
            runId.current = null;
            await refresh();
            setNotice(
              'Your computer is making the first draft. You can stop the run below.',
            );
          });
        }}
      >
        <h2>{parent ? 'Direct the next iteration' : 'What should we make?'}</h2>
        <label>
          Describe the object and what matters
          <textarea
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
        </label>
        {parent && (
          <p>
            Revising run {parent.slice(0, 8)}. Its original file stays intact.{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => setParent('')}
            >
              Start a fresh scene
            </button>
          </p>
        )}
        <label>
          Local model
          <Select
            value={model || null}
            onValueChange={(v) => setModel(String(v))}
            disabled={!connected || busy}
          >
            <SelectTrigger>
              <SelectValue placeholder="Connect to see installed models" />
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
        <p className="workspace-status">
          One model request, up to 48 simple shapes, one 768 × 768 preview.
          Maximum eight minutes. This workflow creates blockouts; rigging,
          animation, textures, and Unreal integration are not connected yet.
        </p>
        <div className="action-buttons">
          <button
            className="primary"
            disabled={
              !connected ||
              !status?.blender ||
              !model ||
              busy ||
              !!status?.active
            }
          >
            {status?.active ? 'A run is in progress' : 'Make a Blender draft'}
          </button>
          {status?.active && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                act(async () => {
                  await request('/cancel', {});
                  setNotice(
                    'Stop requested. Rendering stops immediately; an in-flight model request may take up to four minutes to return.',
                  );
                  await refresh();
                })
              }
            >
              Stop run
            </button>
          )}
        </div>
      </form>
      <h2>Your local iterations</h2>
      {!status?.jobs.length && (
        <p className="update-empty">
          Your first draft will appear here after you connect and start a run.
        </p>
      )}
      {status?.jobs.map((job) => (
        <article key={job.id} className="update-card">
          <div className="update-meta">
            <strong>{job.status}</strong>
            <span>
              {job.model} · {job.id.slice(0, 8)}
            </span>
          </div>
          <p className="post-body">{job.prompt}</p>
          {job.error && <p className="error-note">{job.error}</p>}
          {previews[job.id] && (
            <img
              className="workshop-preview"
              src={previews[job.id]}
              alt="Blender render from this local run"
            />
          )}
          {job.status === 'ready' && (
            <div className="action-buttons">
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    const blob = await localFile(job, 'preview.png');
                    const url = URL.createObjectURL(blob);
                    urls.current.push(url);
                    setPreviews((p) => ({ ...p, [job.id]: url }));
                  })
                }
              >
                Show preview
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setParent(job.id);
                  setPrompt('Change this scene: ');
                  runId.current = null;
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Request changes
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    const blob = await localFile(job, 'artifact.zip');
                    const url = URL.createObjectURL(blob);
                    urls.current.push(url);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'workshop-' + job.id + '.zip';
                    a.click();
                  })
                }
              >
                Download editable result
              </button>
              <button
                className="primary"
                disabled={busy || shared.some((s) => s.id === job.id)}
                onClick={() =>
                  act(async () => {
                    const blob = await localFile(job, 'artifact.zip');
                    const q = new URLSearchParams({
                      mission: 'mahabharata',
                      id: job.id,
                      prompt: job.prompt,
                      model: job.model,
                    });
                    const r = await fetch('/api/workshop?' + q, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/zip' },
                      body: blob,
                    });
                    const d = (await r.json()) as Status & {
                      error: string;
                      artifacts: Shared[];
                      canAccept: boolean;
                    };
                    if (!r.ok) throw Error(d.error);
                    await loadShared();
                    setNotice(
                      'Shared with the mission for review. The result is not accepted automatically.',
                    );
                  })
                }
              >
                Share with mission
              </button>
            </div>
          )}
        </article>
      ))}
      <h2>Shared with the mission</h2>
      {shared.length === 0 && (
        <p className="update-empty">
          Share a result when you want others to review it.
        </p>
      )}
      {shared.map((item) => (
        <article className="update-card" key={item.id}>
          <div className="update-meta">
            <strong>{item.status}</strong>
            <span>
              {item.author} · {item.model}
            </span>
          </div>
          <p>{item.prompt}</p>
          <div className="action-buttons">
            <a
              className="secondary"
              href={'/api/workshop?mission=mahabharata&id=' + item.id}
            >
              Download result
            </a>
            {canAccept && item.status === 'shared' && (
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    const r = await fetch(
                      '/api/workshop?mission=mahabharata&action=accept&id=' +
                        item.id,
                      { method: 'POST' },
                    );
                    const d = (await r.json()) as Status & {
                      error: string;
                      artifacts: Shared[];
                      canAccept: boolean;
                    };
                    if (!r.ok) throw Error(d.error);
                    await loadShared();
                    setNotice(
                      'Accepted. The artifact reference and content hash are recorded in mission Git history.',
                    );
                  })
                }
              >
                Accept into mission
              </button>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
