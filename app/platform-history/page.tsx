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
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>Bring the agent access you already have</h2>
            <p className="post-body">
              Connect Codex with your own ChatGPT subscription, choose an
              available model, and approve a planning or scene-generation run.
              The local workshop keeps control of Blender and the mission lead
              still reviews shared results. Ollama remains available for local
              inference.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>Local work can carry the project’s context</h2>
            <p className="post-body">
              Task runs save a mission text snapshot and provide bounded
              excerpts to the local agent. The complete notes and the excerpt
              used travel with the result, while review feedback helps direct
              the next iteration. Binary assets still need separate handling.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>From agreed task to reviewed result</h2>
            <p className="post-body">
              Open a claimed task in its workshop, create a local result, and
              send it for review. Acceptance records the artifact in mission Git
              history and completes the task together. Requested changes reopen
              the task for another iteration.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>Responsibility can grow with the community</h2>
            <p className="post-body">
              People can explicitly join a mission. Its owner can appoint and
              revoke subdivision leads, whose authority is limited to their
              assigned disciplines. Shared plans and task results enforce that
              scope, including when a role is revoked during a decision.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>Shared ambition, agreed work</h2>
            <p className="post-body">
              Local agents can propose modular work with inputs, outputs,
              dependencies, and review criteria. The mission lead can edit,
              reject, or approve a proposal. Accepted plans create shared tasks
              and enter mission Git history.
            </p>
            <a
              className="text-button"
              href="https://github.com/electronicsanddostoevsky/collaborator"
            >
              Public source and development history ↗
            </a>
            <a className="text-button" href="/vision.pdf">
              Read the revised manifesto ↗
            </a>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>Your computer, on your terms</h2>
            <p className="post-body">
              A local control window now asks before enabling tool access,
              copies your pairing code, and stops work safely. Restarting
              creates a fresh code while preserving local results. Automatic
              startup is off.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>The tools belong to the mission</h2>
            <p className="post-body">
              Every mission can declare the applications and services it needs.
              Connected computers provide operations; agents provide assistance.
              Mahabharata retains Blender and Unreal, while other missions start
              without game-development defaults. Read-only HTTP APIs are now a
              second working adapter.
            </p>
          </article>
          <article className="timeline-item">
            <span className="small-label">10 SEPTEMBER 2026</span>
            <h2>Direct, preview, refine</h2>
            <p className="post-body">
              The local Blender workshop now brings your brief, selected
              preview, and iterations together. Share a preview and editable
              result, receive a review note, and preserve accepted work in
              mission history.
            </p>
            <a className="text-button" href="/workshop">
              Open the workshop ↗
            </a>
          </article>
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
            synchronization, and shared agent scheduling are the next layer. The
            local Blender workshop is available now.
          </p>
        </div>
        <section className="aside-card">
          <span className="eyebrow">FUTURE CHANGE LOG · PLANNED</span>
          <h2>What we build next</h2>
          <ol className="workshop-steps">
            <li>
              <strong>Connection and quality:</strong> easier setup, browser
              compatibility checks, and more reliable first drafts.
            </li>
            <li>
              <strong>Guided revisions:</strong> turn review feedback into new
              iterations and bring workshops to every mission.
            </li>
            <li>
              <strong>Unreal and richer assets:</strong> move from rough Blender
              objects to reviewed assets and playable scenes.
            </li>
            <li>
              <strong>Shared workers:</strong> durable queues, contributed
              compute, explicit budgets, and storage management.
            </li>
            <li>
              <strong>Physical projects and governance:</strong> CAD,
              fabrication review, attribution, and community rules.
            </li>
          </ol>
          <p>
            These are planned integrations. The current workshop uses one local
            computer and a local model.
          </p>
          <a className="text-button" href="/future-changes.md" download>
            Download the detailed future change log ↗
          </a>
        </section>
        <a className="primary" href="/">
          Explore missions →
        </a>
      </main>
    </>
  );
}
