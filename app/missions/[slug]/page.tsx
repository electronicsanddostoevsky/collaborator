import { missions } from '@/lib/missions';
import { notFound } from 'next/navigation';
import Participation from '@/components/collaboration/participation';
export function generateStaticParams() {
  return missions.map((m) => ({ slug: m.slug }));
}
export default async function Mission({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = missions.find((x) => x.slug === slug);
  if (!m) notFound();
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href="/">
          Explore missions
        </a>
      </header>
      <main className="action-mission">
        <span className="eyebrow">{m.category.toUpperCase()}</span>
        <h1>{m.title}</h1>
        <p className="intro">{m.description}</p>
        <div className="mission-layout">
          <section>
            <div className="section-heading">
              <h2>What we want to make happen</h2>
            </div>
            <p className="intro">{m.outcome}</p>
            <p className="mission-caveat">{m.note}</p>
            <Participation mission={m.slug} roles={m.roles} />
          </section>
          <aside>
            <div className="aside-card">
              <span className="small-label">{m.tag}</span>
              <h2>The next steps</h2>
              <ol className="action-steps">
                {m.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
            <div className="aside-section">
              <h3>Bring what you can.</h3>
              <p className="body-copy">
                Interest is a beginning. You can update or withdraw yours as the
                mission takes shape.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
