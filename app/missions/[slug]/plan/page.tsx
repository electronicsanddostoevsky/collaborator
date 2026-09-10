import Planning from '@/components/collaboration/planning';
import { missionDefinition } from '@/db/mission-git';
import { notFound } from 'next/navigation';
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    mission = await missionDefinition(slug);
  if (!mission) notFound();
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a
          className="text-button"
          href={slug === 'mahabharata' ? '/mahabharata' : '/missions/' + slug}
        >
          Back to mission
        </a>
      </header>
      <main className="action-mission">
        <span className="eyebrow">MISSION PLANNING</span>
        <h1>{mission.title}</h1>
        <p className="intro">
          Propose a milestone, agree the work, and build it together.
        </p>
        <a className="text-button" href={'/missions/' + slug + '/workshop'}>
          Open mission tools ↗
        </a>
        <Planning
          mission={slug}
          title={mission.title + '. ' + mission.description}
        />
      </main>
    </>
  );
}
