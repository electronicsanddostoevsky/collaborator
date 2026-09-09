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
          Direct a local AI model and Blender to make a rough 3D asset. Review
          the preview, request changes, and share the editable result.
        </p>
        <Workshop />
      </main>
    </>
  );
}
