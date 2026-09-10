import Workshop from '@/components/collaboration/workshop';
export default function Page() {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href="/mahabharata">
          Back to mission
        </a>
      </header>
      <main className="action-mission">
        <span className="eyebrow">MAHABHARATA · LOCAL WORKSHOP</span>
        <h1>Describe it. Shape it.</h1>
        <p className="body-copy">
          This mission needs Blender for assets and Unreal Engine for its
          playable world. Connect available operations below; tools and agents
          are separate capabilities.
        </p>
        <Workshop />
      </main>
    </>
  );
}
