'use client';
import { useEffect, useState } from 'react';
import { categories } from '@/lib/mission-input';
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Search,
  BookOpen,
  Waves,
  Wrench,
} from 'lucide-react';
import { missions } from '@/lib/missions';
const cards = [
  {
    slug: 'mahabharata',
    href: '/mahabharata',
    title: 'Make the epic playable.',
    category: 'Creative worlds',
    tag: 'First mission · Building the foundation',
    description:
      'A community-built Mahabharata game. Bring lore, creative judgment, or a small experiment.',
    icon: BookOpen,
  },
  ...missions.map((m) => ({
    ...m,
    href: '/missions/' + m.slug,
    icon: m.slug === 'beach-cleanup' ? Waves : Wrench,
  })),
];
export default function Feed() {
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('All missions');
  const [created, setCreated] = useState<typeof cards>([]),
    [loadError, setLoadError] = useState('');
  useEffect(() => {
    fetch('/api/missions', { cache: 'no-store' })
      .then(async (r) => {
        const d = (await r.json()) as {
          error: string;
          missions: {
            id: string;
            title: string;
            category: string;
            description: string;
            intent: string;
            revision: number;
          }[];
        };
        if (!r.ok) throw Error(d.error);
        setCreated(
          d.missions.map((m) => ({
            slug: m.id,
            href: '/missions/' + m.id,
            title: m.title,
            category: m.category,
            description: m.description,
            tag:
              (m.intent === 'commercial'
                ? 'Commercial intent'
                : 'Community mission') +
              ' · Revision ' +
              m.revision,
            icon: Compass,
          })),
        );
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  const results = [...created, ...cards].filter(
    (c) =>
      (filter === 'All missions' || c.category === filter) &&
      (c.title + ' ' + c.description + ' ' + c.category)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-symbol">c↗</span>collaborator
        </a>
        <a className="text-button" href="/my-missions">
          My missions
        </a>
        <a className="primary" href="/missions/new">
          Start a mission <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <div className="feed-heading">
          <span className="eyebrow">FIND SOMETHING WORTH DOING</span>
          <h1>
            What do you want
            <br />
            to make happen?
          </h1>
          <p>
            Find your people through the things you want to exist.
            <br />
            Bring an idea, a little time, or whatever you can contribute.
          </p>
        </div>
        <div className="feed-tools">
          <label className="mission-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a mission…"
              aria-label="Search missions"
            />
          </label>
          <div className="filter-buttons" aria-label="Mission categories">
            {['All missions', ...categories].map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="section-heading">
          <h2>
            <Compass size={21} /> Explore missions
          </h2>
          <span className="small-label">{results.length} TO EXPLORE</span>
        </div>
        {loadError && (
          <p className="error-note" role="alert">
            {loadError} The example missions are still available.
          </p>
        )}
        <div className="mission-grid">
          {results.map((c, i) => (
            <a
              href={c.href}
              className={'mission-card mission-' + c.slug}
              key={c.slug}
            >
              <div className="mission-card-visual">
                {c.slug === 'mahabharata' ? (
                  <img
                    src="/mission-concept.png"
                    alt="Mahabharata battlefield concept art"
                  />
                ) : (
                  <>
                    <c.icon size={48} />
                    <span>{c.category}</span>
                  </>
                )}
              </div>
              <div className="mission-card-body">
                <span className="small-label">{c.tag}</span>
                <h2>{c.title}</h2>
                <p>{c.description}</p>
                <span className="text-button">
                  Find a way to help
                  <ArrowUpRight size={17} />
                </span>
              </div>
            </a>
          ))}
        </div>
        {!results.length && (
          <div className="empty-build">
            <h2>No matching missions.</h2>
            <button
              className="text-button"
              onClick={() => {
                setQuery('');
                setFilter('All missions');
              }}
            >
              Show all missions
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="feed-principle">
          <span className="eyebrow">MORE THAN A PLACE TO SCROLL</span>
          <h2>An idea. A shared purpose. A next step.</h2>
          <p>
            A game, a cleaner beach, a strange invention. Over time, a company
            or a movement. Missions turn what people care about into something
            they can do together.
          </p>
          <a href="/vision.pdf" className="text-button" download>
            Read the vision
            <ArrowUpRight size={16} />
          </a>
        </div>
      </main>
      <footer>
        <span>Help make it exist.</span>
        <span>Shared purpose · Small contributions · Real progress</span>
      </footer>
    </>
  );
}
