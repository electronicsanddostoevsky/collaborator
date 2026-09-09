'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
type Data = {
  repository: {
    head: string;
    fork_policy: string;
    upstream: string | null;
    fork_base: string | null;
  };
  commits: {
    oid: string;
    parent: string | null;
    author: string;
    message: string;
    created_at: string;
    mission: string;
  }[];
  signedIn: boolean;
  error: string;
};
export default function Repository({ mission }: { mission: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(''),
    [title, setTitle] = useState(''),
    [busy, setBusy] = useState(false);
  const forkId = useRef<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/mission-git?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as Data;
    if (!r.ok) throw Error(d.error);
    setData(d);
    setError('');
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  return (
    <section className="repository-panel">
      <div className="section-heading">
        <h2>This mission’s Git repository</h2>
        <button
          className="text-button"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Preparing mission history…</p>}
      {data && (
        <>
          <p className="body-copy">
            Mission brief versions have real commits and shared ancestry. This
            workspace versions the mission definition and working text files;
            conversations and action results appear in the activity log below.
          </p>
          <div className="repository-head">
            <span>main</span>
            <code>{data.repository.head.slice(0, 12)}</code>
            <span>
              {data.commits.length} commit{data.commits.length === 1 ? '' : 's'}
            </span>
          </div>
          {data.repository.upstream && (
            <p className="body-copy">
              Forked from{' '}
              <a
                className="text-button"
                href={'/missions/' + data.repository.upstream + '/history'}
              >
                the upstream mission
              </a>{' '}
              at <code>{data.repository.fork_base?.slice(0, 12)}</code>. Your
              mission now evolves independently.
            </p>
          )}
          <div className="action-buttons">
            <a className="primary" href={'/missions/' + mission + '/workspace'}>
              Open working files →
            </a>
            <a
              className="secondary"
              href={
                '/api/mission-git?mission=' +
                encodeURIComponent(mission) +
                '&download=1'
              }
            >
              Download Git repository ↓
            </a>
          </div>
          <details className="action-history">
            <summary>Inspect commits</summary>
            {data.commits.map((c) => (
              <article className="history-entry" key={c.oid}>
                <div className="update-meta">
                  <strong>{c.message}</strong>
                  <code>{c.oid.slice(0, 12)}</code>
                </div>
                <p className="workspace-status">
                  {c.author} · {new Date(c.created_at).toLocaleString()}
                  {c.mission !== mission ? ' · Upstream history' : ''}
                </p>
                {c.parent && (
                  <p className="workspace-status">
                    Parent <code>{c.parent.slice(0, 12)}</code>
                  </p>
                )}
              </article>
            ))}
          </details>
          {data.repository.fork_policy === 'allowed' ? (
            data.signedIn ? (
              <details className="action-create">
                <summary>
                  Fork this mission <span>↗</span>
                </summary>
                <p className="body-copy">
                  Start your own direction from this exact version. The brief,
                  working text files, and Git ancestry carry over. People,
                  action assignments, conversations, and uploaded files stay
                  with the original mission. Commercial intent and fork
                  permission are preserved.
                </p>
                <form
                  className="update-composer"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError('');
                    forkId.current ??= crypto.randomUUID();
                    try {
                      const r = await fetch('/api/missions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'fork',
                          id: forkId.current,
                          sourceMission: mission,
                          baseOid: data.repository.head,
                          title,
                        }),
                      });
                      const d = (await r.json()) as {
                        id: string;
                        error: string;
                      };
                      if (!r.ok) throw Error(d.error);
                      window.location.assign('/missions/' + d.id);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : 'Could not fork.',
                      );
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Name your direction
                    <input
                      required
                      minLength={5}
                      maxLength={100}
                      value={title}
                      disabled={busy}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        forkId.current = null;
                      }}
                      placeholder="A new direction for this mission"
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    {busy ? 'Creating your fork…' : 'Create my fork'}
                  </button>
                </form>
              </details>
            ) : (
              <a
                className="text-button"
                target="_top"
                href={
                  '/signin-with-chatgpt?return_to=' +
                  encodeURIComponent('/missions/' + mission + '/history')
                }
              >
                Sign in to fork this mission
              </a>
            )
          ) : (
            <p className="workspace-status">
              This mission was created with platform forks disabled.
            </p>
          )}
        </>
      )}
    </section>
  );
}
