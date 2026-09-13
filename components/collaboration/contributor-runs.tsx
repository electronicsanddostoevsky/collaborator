'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
type LocalJob = { id: string; status: string };
type Run = {
  id: string;
  author: string;
  model: string;
  tool: string;
  status: string;
  stale: boolean;
  mine: boolean;
  task_title?: string;
  updated_at: string;
};
export default function ContributorRuns({
  mission,
  jobs,
  connected,
}: {
  mission: string;
  jobs: LocalJob[];
  connected: boolean;
}) {
  const [runs, setRuns] = useState<Run[]>([]),
    [error, setError] = useState(''),
    [confirmed, setConfirmed] = useState('');
  const [elsewhere, setElsewhere] = useState<
    { id: string; mission: string; title: string }[]
  >([]);
  const latest = useRef({ jobs, connected });
  latest.current = { jobs, connected };
  const load = useCallback(async () => {
    const r = await fetch('/api/runs?mission=' + encodeURIComponent(mission), {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const d = (await r.json()) as {
      runs: Run[];
      error: string;
      elsewhere: { id: string; mission: string; title: string }[];
    };
    if (!r.ok) throw Error(d.error);
    setRuns(d.runs);
    setElsewhere(d.elsewhere);
    return d.runs;
  }, [mission]);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const rows = await load();
        if (!disposed && latest.current.connected) {
          for (const run of rows.filter(
            (r) => r.mine && r.status === 'active',
          )) {
            const local = latest.current.jobs.find((j) => j.id === run.id);
            if (!local) continue;
            const status = ['ready', 'failed', 'stopped'].includes(local.status)
              ? local.status
              : 'active';
            const r = await fetch('/api/runs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mission,
                id: run.id,
                operation: 'report',
                status,
              }),
              signal: AbortSignal.timeout(10000),
            });
            if (!r.ok)
              throw Error(
                'Progress could not be synchronized. Your local work is retained.',
              );
          }
        }
        if (!disposed) setError('');
      } catch (e) {
        if (!disposed)
          setError(e instanceof Error ? e.message : 'Could not load runs.');
      }
      if (!disposed) timer = setTimeout(tick, 15000);
    }
    void tick();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [load, mission]);
  return (
    <section className="plan-panel">
      <h2>Contributors at work</h2>
      <p className="field-note">
        Progress is reported by each contributor’s open workshop. Closing a tab
        pauses status updates; it does not stop the local agent. Results still
        need to be shared and reviewed.
      </p>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {elsewhere.map((r) => (
        <p key={r.id} className="error-note">
          You have an unresolved run in{' '}
          <a
            className="text-button"
            href={'/missions/' + r.mission + '/workshop'}
          >
            {r.title} ↗
          </a>
          . Reconnect there before starting another.
        </p>
      ))}
      {!runs.length && (
        <p>
          No recorded runs yet. Join this mission and start a contribution
          below.
        </p>
      )}
      {runs.slice(0, 20).map((r) => (
        <article className="run-row" key={r.id}>
          <div>
            <strong>{r.task_title || 'Mission experiment'}</strong>
            <p>
              {r.author} ·{' '}
              {r.tool === 'mission-writer' ? 'Written contribution' : r.tool}
            </p>
            <small>
              {r.model.startsWith('codex:')
                ? 'Contributor’s Codex subscription'
                : 'Contributor’s local connection'}
            </small>
          </div>
          <div>
            <strong>
              {r.stale
                ? 'Connection needs checking'
                : r.status === 'active'
                  ? 'In progress'
                  : r.status === 'ready'
                    ? 'Draft ready on contributor’s computer'
                    : r.status === 'closed'
                      ? 'Tracking closed'
                      : r.status}
            </strong>
            {r.mine && r.status === 'active' && (
              <details>
                <summary>Recover an unresolved run</summary>
                <p>
                  Check the local workshop first. Stop its active run there, or
                  confirm it has already finished. This button only closes the
                  shared status record.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed === r.id}
                    onChange={(e) => setConfirmed(e.target.checked ? r.id : '')}
                  />{' '}
                  I checked the computer and this run is no longer active.
                </label>
                <button
                  className="secondary"
                  disabled={confirmed !== r.id}
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/runs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          mission,
                          id: r.id,
                          operation: 'close',
                          confirmStopped: true,
                        }),
                      });
                      if (!response.ok)
                        throw Error('Could not close tracking. Retry.');
                      setConfirmed('');
                      await load();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : 'Could not close tracking.',
                      );
                    }
                  }}
                >
                  Close tracking
                </button>
              </details>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
