export default function PlatformHistory() {
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
        <span className="eyebrow">BUILDING COLLABORATOR</span>
        <h1>The platform’s own story.</h1>
        <p className="intro">
          Collaborator evolves too. Its code and development history live in a
          dedicated Git repository, separate from the missions people create
          here.
        </p>
        <div className="mission-timeline">
          <article className="timeline-item">
            <span className="small-label">9 SEPTEMBER 2026</span>
            <h2>Independent ideas, shared progress</h2>
            <p className="post-body">
              Fork a mission, develop its working files, and propose changes
              back to the original. Maintainers compare both versions, resolve
              conflicting files, and accept a contribution with a recorded
              review. The resulting Git merge preserves both histories.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">9 SEPTEMBER 2026</span>
            <h2>From interest to action</h2>
            <p className="post-body">
              Mission creators can offer clear actions with a definition of
              done. People take responsibility, submit a result, and receive a
              review. Each step stays in the action’s history.
            </p>
            <p className="post-body">
              Mission briefs now keep versions. The mission history view brings
              together brief changes, conversations, actions, and contribution
              reviews, with an export of recent records.
            </p>
          </article>
          <article className="timeline-item">
            <h2>A reason to return</h2>
            <p className="post-body">
              Mission updates and replies help participants stay in touch. My
              missions brings together the missions you create, join, and
              follow.
            </p>
          </article>
          <article className="timeline-item">
            <h2>The first collaboration loop</h2>
            <p className="post-body">
              The Mahabharata mission introduced claiming work, sharing
              artifacts, reviewing contributions, and accepting revisions.
              Mission creation and participation extended the platform to
              real-world action and physical inventions.
            </p>
          </article>
        </div>
        <div className="aside-card">
          <h2>Real Git histories, with more to come</h2>
          <p className="body-copy">
            Each mission now has Git history for its definition and small
            working text files. Download a repository or fork from a recorded
            version while preserving files and ancestry. Large assets, remote
            synchronization, and agent execution are the next layer.
          </p>
        </div>
        <a className="primary" href="/">
          Explore missions →
        </a>
      </main>
    </>
  );
}
