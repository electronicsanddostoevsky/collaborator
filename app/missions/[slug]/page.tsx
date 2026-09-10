import Updates from '@/components/collaboration/updates';
import Actions from '@/components/collaboration/actions';
import FollowMission from '@/components/collaboration/follow';
import { getMission } from '@/db/missions';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Participation from '@/components/collaboration/participation';
export const dynamic = 'force-dynamic';
export default async function Mission({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m = await getMission(slug);
  if (!m) notFound();
  const h = await headers();
  const canEdit =
    !!m.ownerId &&
    h.get('oai-authenticated-user-id') === m.ownerId &&
    !!h.get('oai-authenticated-user-email');
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href="/my-missions">
          My missions
        </a>
        <a className="text-button" href="/">
          Explore missions
        </a>
      </header>
      <main className="action-mission">
        <span className="eyebrow">{m.category.toUpperCase()}</span>
        <h1>{m.title}</h1>
        <p className="intro">{m.description}</p>
        <FollowMission mission={m.slug} />
        <a className="primary" href={'/missions/' + m.slug + '/workshop'}>
          Open mission workshop ↗
        </a>
        <p className="workspace-status">
          {m.intent === 'commercial'
            ? 'Commercial intent'
            : 'Community · Noncommercial intent'}{' '}
          · Revision {m.revision}
        </p>
        <a className="text-button" href={'/missions/' + m.slug + '/history'}>
          View mission history →
        </a>
        <a className="text-button" href={'/missions/' + m.slug + '/workspace'}>
          Working files →
        </a>
        {canEdit && (
          <a className="secondary" href={'/missions/new?edit=' + m.slug}>
            Edit mission
          </a>
        )}
        <div className="mission-layout">
          <section>
            <div className="section-heading">
              <h2>What we want to make happen</h2>
            </div>
            <p className="intro">{m.outcome}</p>
            <p className="mission-caveat">{m.note}</p>
            <Actions mission={m.slug} />
            <Participation mission={m.slug} roles={m.roles} />
            <Updates mission={m.slug} />
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
