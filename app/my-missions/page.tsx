'use client';
import { useCallback, useEffect, useState } from 'react';
type Mission = {
  id: string;
  href: string;
  title: string;
  category: string;
  role: string;
  created: boolean;
  joined: boolean;
  following: boolean;
  activeActions: number;
  pendingActions: number;
  latest: { body: string; created_at: string } | null;
};
export default function MyMissions() {
  const [data, setData] = useState<{
      missions: Mission[];
      pendingReviews: number;
    } | null>(null),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('All'),
    [signin, setSignin] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/my-missions', { cache: 'no-store' });
      const d = (await r.json()) as {
        missions: Mission[];
        pendingReviews: number;
        error: string;
      };
      setSignin(r.status === 401);
      if (!r.ok) throw Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load your missions.',
      );
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const shown = data?.missions.filter(
    (m) =>
      filter === 'All' ||
      (filter === 'Created'
        ? m.created
        : filter === 'Following'
          ? m.following
          : m.joined),
  );
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href="/">
          Explore missions
        </a>
        <a className="primary" href="/missions/new">
          Start a mission ↗
        </a>
      </header>
      <main className="action-mission">
        <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
        <h1>My missions</h1>
        <p className="intro">The things you’re helping make happen.</p>
        <div className="history-tools">
          <div className="filter-buttons" aria-label="Filter your missions">
            {['All', 'Created', 'Following', 'Participating'].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button className="text-button" onClick={load}>
            Refresh missions
          </button>
        </div>
        {error && (
          <p role="alert" className="error-note">
            {error}
          </p>
        )}
        {signin && (
          <a
            className="primary"
            href="/signin-with-chatgpt?return_to=%2Fmy-missions"
          >
            Sign in to see your missions
          </a>
        )}
        {!data && !error && <p role="status">Finding your missions…</p>}
        {!!data?.pendingReviews && (
          <a className="next-strip" href="/mahabharata">
            {data.pendingReviews} contribution
            {data.pendingReviews === 1 ? '' : 's'} waiting for your review →
          </a>
        )}
        {data?.missions.length === 0 && (
          <div className="update-empty">
            <h2>Your next mission is out there.</h2>
            <p>
              Join a mission, follow something you care about, or start
              something you want to see happen.
            </p>
            <a className="primary" href="/">
              Explore missions →
            </a>
          </div>
        )}
        <div className="my-mission-grid">
          {data && data.missions.length > 0 && shown?.length === 0 && (
            <p className="update-empty">
              No missions in this view yet. Follow one you care about or take a
              small action.
            </p>
          )}
          {shown?.map((m) => (
            <a className="my-mission-card" key={m.id} href={m.href}>
              <span className="eyebrow">{m.category}</span>
              <h2>{m.title}</h2>
              <div className="update-meta">
                <strong>
                  {[
                    m.created && 'Created by you',
                    m.joined && 'Participating',
                    m.following && 'Following',
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Maintaining'}
                </strong>
              </div>
              {m.role && <p>{m.role}</p>}
              {!!m.activeActions && (
                <p className="action-reminder">
                  {m.activeActions} action{m.activeActions === 1 ? '' : 's'}{' '}
                  you’re taking forward
                </p>
              )}
              {!!m.pendingActions && (
                <p className="action-reminder">
                  {m.pendingActions} result{m.pendingActions === 1 ? '' : 's'}{' '}
                  waiting for your review
                </p>
              )}
              <div className="latest-update">
                <span className="small-label">LATEST UPDATE</span>
                <p>
                  {m.latest
                    ? m.latest.body
                    : 'No updates yet. Help shape what happens next.'}
                </p>
              </div>
              <span className="text-button">Continue mission →</span>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
