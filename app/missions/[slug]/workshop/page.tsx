import Workshop from '@/components/collaboration/workshop';
import { missionDefinition } from '@/db/mission-git';
import { notFound } from 'next/navigation';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { slug } = await params;
  const { task } = await searchParams;
  const mission = await missionDefinition(slug);
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
        <span className="eyebrow">MISSION WORKSPACE</span>
        <h1>{mission.title}</h1>
        <p className="body-copy">
          Bring the tools this mission needs. Connect a computer, choose an
          available operation, and share the result for review.
        </p>
        <a className="text-button" href={'/missions/' + slug + '/team'}>
          Community and leads ↗
        </a>
        <a className="text-button" href={'/missions/' + slug + '/plan'}>
          Plan work with AI and approve tasks ↗
        </a>
        <Workshop
          mission={slug}
          taskId={typeof task === 'string' ? task : undefined}
        />
      </main>
    </>
  );
}
