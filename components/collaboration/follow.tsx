'use client';
import { useCallback, useEffect, useState } from 'react';
type State = {
  count: number;
  following: boolean;
  signedIn: boolean;
  error: string;
};
export default function FollowMission({ mission }: { mission: string }) {
  const [data, setData] = useState<State | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/follow?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as State;
    if (!r.ok) throw Error(d.error);
    setData(d);
    setError('');
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  return (
    <div className="follow-mission">
      {data?.signedIn ? (
        <button
          className={data.following ? 'secondary' : 'primary'}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const r = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mission, following: !data.following }),
              });
              const d = (await r.json()) as { error: string };
              if (!r.ok) throw Error(d.error);
              await load();
              window.dispatchEvent(new Event('mission-participation-changed'));
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Saving…' : data.following ? 'Following ✓' : 'Follow mission'}
        </button>
      ) : data ? (
        <a
          className="secondary"
          target="_top"
          href={
            '/signin-with-chatgpt?return_to=' +
            encodeURIComponent('/missions/' + mission)
          }
        >
          Sign in to follow
        </a>
      ) : !error ? (
        <span role="status">Loading follow status…</span>
      ) : null}
      {data && (
        <span className="workspace-status">
          {data.count} following · Keep it in My missions without committing to
          a role.
        </span>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error}{' '}
          <button
            className="text-button"
            onClick={() => load().catch((e) => setError(e.message))}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
