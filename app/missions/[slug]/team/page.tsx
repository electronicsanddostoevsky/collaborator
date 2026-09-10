import Team from '@/components/collaboration/team';
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
        <span className="eyebrow">MISSION COMMUNITY</span>
        <h1>{mission.title}</h1>
        <a className="text-button" href={'/missions/' + slug + '/plan'}>
          Plan and review work ↗
        </a>
        <Team mission={slug} />
      </main>
    </>
  );
}
