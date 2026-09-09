'use client';
import { useEffect, useState } from 'react';
type Mission = {
  id: string;
  href: string;
  title: string;
  category: string;
  role: string;
  created: boolean;
  joined: boolean;
  following: boolean;
  latest: { body: string; created_at: string } | null;
};
export default function MyMissions() {
  const [data, setData] = useState<{
      missions: Mission[];
      pendingReviews: number;
    } | null>(null),
    [error, setError] = useState(''),
    [signin, setSignin] = useState(false);
  useEffect(() => {
    fetch('/api/my-missions', { cache: 'no-store' })
      .then(async (r) => {
        const d = (await r.json()) as {
          missions: Mission[];
          pendingReviews: number;
          error: string;
        };
        if (r.status === 401) setSignin(true);
        if (!r.ok) throw Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, []);
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
              Join a mission, follow the Mahabharata project, or start something
              you want to see happen.
            </p>
            <a className="primary" href="/">
              Explore missions →
            </a>
          </div>
        )}
        <div className="my-mission-grid">
          {data?.missions.map((m) => (
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
