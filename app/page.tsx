'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { categories } from '@/lib/mission-input';
import {
  ArrowUpRight,
  Search,
  Plus,
  Users,
  CheckCircle2,
  Compass,
} from 'lucide-react';
type Mission = {
  id: string;
  title: string;
  description: string;
  category: string;
  intent: string;
  example: number;
  created_at: string;
  members: number;
  open_tasks: number;
  completed_tasks: number;
};
export default function Feed() {
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState('');
  const [items, setItems] = useState<Mission[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false);
  const generation = useRef(0),
    pending = useRef(false),
    sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const fetchPage = useCallback(
    async (next: string | null, stamp: number) => {
      pending.current = true;
      setBusy(true);
      setError('');
      try {
        const params = new URLSearchParams({ q: search, category });
        if (next) params.set('cursor', next);
        const response = await fetch('/api/feed?' + params, {
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        const data = (await response.json()) as {
          missions: Mission[];
          nextCursor: string | null;
          error?: string;
        };
        if (!response.ok) throw Error(data.error || 'Unable to load missions.');
        if (generation.current !== stamp) return;
        setItems((old) =>
          next
            ? [
                ...old,
                ...data.missions.filter((m) => !old.some((o) => o.id === m.id)),
              ]
            : data.missions,
        );
        setCursor(data.nextCursor);
        setLoaded(true);
      } catch (e) {
        if (generation.current === stamp)
          setError(e instanceof Error ? e.message : 'Could not load missions.');
      } finally {
        if (generation.current === stamp) {
          pending.current = false;
          setBusy(false);
        }
      }
    },
    [search, category],
  );
  useEffect(() => {
    const stamp = ++generation.current;
    setItems([]);
    setCursor(null);
    setLoaded(false);
    void fetchPage(null, stamp);
    return () => {
      generation.current++;
    };
  }, [fetchPage]);
  useEffect(() => {
    if (!cursor || error || !sentinel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !pending.current)
          void fetchPage(cursor, generation.current);
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [cursor, error, fetchPage]);
  return (
    <>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-symbol">c↗</span>collaborator
        </a>
        <a className="text-button" href="/my-missions">
          My missions
        </a>
        <a className="text-button" href="/pilot">
          Getting started
        </a>
        <a className="primary" href="/missions/new">
          <Plus size={17} /> Start a mission
        </a>
      </header>
      <main className="social-layout">
        <aside className="feed-sidebar">
          <span className="eyebrow">YOUR COMMUNITY</span>
          <h1>Find your next shared purpose.</h1>
          <p>
            A little time, an idea, your agent. Make something happen together.
          </p>
          <nav aria-label="Mission categories">
            {['', ...categories].map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c || 'All missions'}
              </button>
            ))}
          </nav>
          <a href="/vision.pdf">Read our vision ↗</a>
        </aside>
        <section className="social-feed" aria-label="Mission feed">
          <div className="feed-toolbar">
            <h2>
              <Compass size={21} /> Missions
            </h2>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                const stamp = ++generation.current;
                void fetchPage(null, stamp);
              }}
            >
              Refresh
            </button>
          </div>
          <label className="mission-search">
            <Search size={18} />
            <input
              aria-label="Search missions"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find something you care about…"
            />
          </label>
          <a className="feed-composer" href="/missions/new">
            <span className="feed-avatar">
              <Plus size={22} />
            </span>
            <span>
              What do you want to make happen?
              <small>Invite the group into a new mission</small>
            </span>
            <ArrowUpRight size={20} />
          </a>
          <p className="field-note">
            Shared with invited testers · Newest missions first
          </p>
          <div aria-busy={busy}>
            {items.map((m) => (
              <article key={m.id} className="feed-post">
                <div className="feed-post-meta">
                  <span>{m.category}</span>
                  <span>
                    {m.example
                      ? m.id === 'mahabharata'
                        ? 'Founding mission'
                        : 'Example mission'
                      : new Date(m.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                  </span>
                </div>
                {m.id === 'mahabharata' && (
                  <a href="/mahabharata">
                    <img
                      className="feed-cover"
                      src="/mission-concept.png"
                      alt="Mahabharata battlefield concept art"
                      loading="lazy"
                    />
                  </a>
                )}
                <div className="feed-post-body">
                  <h2>
                    <a
                      href={
                        m.id === 'mahabharata'
                          ? '/mahabharata'
                          : '/missions/' + m.id
                      }
                    >
                      {m.title}
                    </a>
                  </h2>
                  <p>{m.description}</p>
                  <div className="feed-counts">
                    <span>
                      <Users size={16} /> {m.members} joined
                    </span>
                    <span>{m.open_tasks} open tasks</span>
                    {m.completed_tasks > 0 && (
                      <span>
                        <CheckCircle2 size={16} /> {m.completed_tasks} completed
                      </span>
                    )}
                  </div>
                  {m.intent === 'commercial' && (
                    <p className="field-note">Commercial intent declared</p>
                  )}
                  <div className="feed-post-actions">
                    <a
                      className="primary"
                      href={
                        m.id === 'mahabharata'
                          ? '/mahabharata'
                          : '/missions/' + m.id
                      }
                    >
                      Explore & join <ArrowUpRight size={16} />
                    </a>
                    <a
                      className="text-button"
                      href={'/missions/' + m.id + '/plan'}
                    >
                      Find a task
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {error && (
            <div className="error-note" role="alert">
              {error}{' '}
              <button
                className="text-button"
                onClick={() => void fetchPage(cursor, generation.current)}
              >
                Try again
              </button>
            </div>
          )}
          {loaded && !items.length && (
            <div className="empty-build">
              <h2>No matching missions yet.</h2>
              <p>Try another search, or start the mission you wish existed.</p>
              <a className="primary" href="/missions/new">
                Start a mission
              </a>
            </div>
          )}
          <div ref={sentinel} className="feed-end" aria-live="polite">
            {busy ? (
              'Loading missions…'
            ) : cursor ? (
              <button
                className="secondary"
                onClick={() => void fetchPage(cursor, generation.current)}
              >
                More missions
              </button>
            ) : loaded && items.length > 0 ? (
              'You’re caught up. Pick a mission and take a small next step.'
            ) : (
              ''
            )}
          </div>
        </section>
        <aside className="feed-aside">
          <div className="aside-card">
            <span className="eyebrow">FROM INTEREST TO ACTION</span>
            <h2>Your agent can help.</h2>
            <p>
              Join a mission. Choose an agreed task. Use your own
              ChatGPT-connected Codex or local model to make a draft, then share
              it for review.
            </p>
            <a className="text-button" href="/pilot">
              Set up your contribution ↗
            </a>
          </div>
          <p className="field-note">
            Your account stays yours. The community shares work and outcomes.
          </p>
        </aside>
      </main>
    </>
  );
}
