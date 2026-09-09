import { notFound } from 'next/navigation';
import { getMission } from '@/db/missions';
import Files from '@/components/collaboration/files';
export const dynamic = 'force-dynamic';
export default async function Workspace({
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
        <a
          className="text-button"
          href={slug === 'mahabharata' ? '/mahabharata' : '/missions/' + slug}
        >
          ← Back to mission
        </a>
        <span className="eyebrow">{m.title}</span>
        <h1>Working files</h1>
        <Files mission={slug} />
      </main>
    </>
  );
}
