import { getMission } from '@/db/missions';
import { notFound } from 'next/navigation';
import MergeRequests from '@/components/collaboration/merge-requests';
export const dynamic = 'force-dynamic';
export default async function Proposals({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const m =
    slug === 'mahabharata'
      ? { title: 'Make the epic playable.' }
      : await getMission(slug);
  if (!m) notFound();
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
        <a className="text-button" href={'/missions/' + slug + '/workspace'}>
          ← Working files
        </a>
        <span className="eyebrow">{m.title}</span>
        <h1>Proposed contributions</h1>
        <MergeRequests mission={slug} />
      </main>
    </>
  );
}
