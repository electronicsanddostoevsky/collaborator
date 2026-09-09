import { notFound } from 'next/navigation';
import { getMission } from '@/db/missions';
import History from '@/components/collaboration/history';
import Repository from '@/components/collaboration/repository';
export const dynamic = 'force-dynamic';
export default async function MissionHistory({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mission =
    slug === 'mahabharata'
      ? { title: 'Make the epic playable.' }
      : await getMission(slug);
  if (!mission) notFound();
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href="/my-missions">
          My missions
        </a>
      </header>
      <main className="action-mission">
        <a
          className="text-button"
          href={slug === 'mahabharata' ? '/mahabharata' : '/missions/' + slug}
        >
          ← Back to mission
        </a>
        <span className="eyebrow">{mission.title}</span>
        <h1>Mission history</h1>
        <p className="intro">
          A record of decisions, contributions, and steps forward.
        </p>
        <Repository mission={slug} />
        <History mission={slug} />
      </main>
    </>
  );
}
