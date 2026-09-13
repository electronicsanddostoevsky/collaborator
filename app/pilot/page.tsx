export default function PilotGuide() {
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href="/">
          Mission feed
        </a>
        <a className="primary" href="/missions/new">
          Start a mission
        </a>
      </header>
      <main className="pilot-guide">
        <span className="eyebrow">INVITED TESTER GUIDE</span>
        <h1>
          Bring an idea.
          <br />
          Build it together.
        </h1>
        <p className="intro">
          Every tester can start a mission, join another, and contribute useful
          work. You don’t need a paid AI subscription to join or review.
        </p>
        <section className="plan-panel">
          <h2>1. Find your people</h2>
          <p>
            Sign in with the ChatGPT account that was invited. Browse the feed
            or create a mission. Each mission appears to everyone in this
            invited group. Open its <strong>Community and leads</strong> page
            and join.
          </p>
          <a className="primary" href="/">
            Browse missions ↗
          </a>
        </section>
        <section className="plan-panel">
          <h2>2. Agree on a small outcome</h2>
          <p>
            Open the mission’s plan. Describe a manageable first milestone and
            ask your connected agent to propose tasks. Anyone can propose; the
            mission creator or appointed lead reviews, changes and approves the
            plan. Claim an available task to take responsibility for it.
          </p>
          <p>
            For your first test, try a written contribution: an event checklist,
            a creative scene, a specification, or a research draft from material
            you supply.
          </p>
        </section>
        <section className="plan-panel">
          <h2>3. Connect your own computer</h2>
          <ol>
            <li>Download the workshop and extract the whole folder.</li>
            <li>
              Install Python if needed. On Windows, open{' '}
              <strong>Start workshop.cmd</strong>, allow the local connection,
              then choose <strong>Start workshop</strong>.
            </li>
            <li>
              Open the mission’s workshop and enter the pairing code shown on
              your computer. Keep the control window open.
            </li>
            <li>
              Choose your agent below, then choose{' '}
              <strong>Written contribution</strong> or a tool configured for
              that mission.
            </li>
          </ol>
          <a
            className="primary"
            href="/workshop/Collaborator-Workshop.zip"
            download
          >
            Download the workshop ↗
          </a>
          <p className="field-note">
            Windows is the tested setup. macOS and Linux can run the Python
            companion, but have not yet been verified in this pilot.
          </p>
        </section>
        <div className="pilot-options">
          <section className="plan-panel">
            <h2>Your ChatGPT subscription</h2>
            <p>
              Install the Codex CLI using its official instructions. In the
              mission workshop choose <strong>Connect Codex</strong>, then
              complete the official ChatGPT sign-in on your own computer.
            </p>
            <p>
              Your available models are discovered from your account. Each run
              asks permission to send the brief and selected project excerpts.
              Your account allowance applies; the platform does not switch to
              paid API billing.
            </p>
            <a
              className="text-button"
              href="https://developers.openai.com/codex/cli/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Official Codex setup ↗
            </a>
          </section>
          <section className="plan-panel">
            <h2>A local language model</h2>
            <p>
              Install Ollama and download a model that fits your computer. Start
              Ollama, reconnect the workshop, and select that model. Generation
              runs on your computer; only results you choose to share are
              uploaded.
            </p>
            <p>
              No Blender installation is needed for written contributions.
              Mahabharata’s 3D work uses Blender. Unreal execution is not
              connected yet.
            </p>
            <a
              className="text-button"
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Ollama ↗
            </a>
          </section>
        </div>
        <section className="plan-panel">
          <h2>4. Share, review, build on it</h2>
          <p>
            Read the local draft before sharing.{' '}
            <strong>Share with mission</strong> uploads the result and sends a
            linked task for review. The lead can request changes or accept it.
            Accepted writing becomes a mission working file, preserved in Git
            history and included in future task reference excerpts.
          </p>
          <p>
            A ready draft is not an approved result. Check facts, assumptions
            and whether it meets the agreed task. This pilot’s agents draft text
            and basic Blender scenes; they do not automatically browse, send
            messages, execute arbitrary code, or manufacture things.
          </p>
        </section>
        <section className="plan-panel">
          <h2>If something stops</h2>
          <ul>
            <li>
              <strong>Browser closed?</strong> Your local run can continue.
              Reopen the same mission, reconnect its computer, and select the
              retained run.
            </li>
            <li>
              <strong>Computer restarted?</strong> Restart the workshop and pair
              again. Interrupted runs are marked stopped; they never silently
              restart and consume more allowance.
            </li>
            <li>
              <strong>Unresolved shared status?</strong> Check or stop the run
              on its computer first. Then use{' '}
              <strong>Recover an unresolved run</strong> in the workshop.
              Closing tracking does not stop an agent.
            </li>
            <li>
              <strong>Allowances exhausted?</strong> Wait for your provider’s
              reset, or deliberately choose an available local model for a new
              run.
            </li>
          </ul>
          <p className="field-note">
            Pilot bounds: one tracked active run per contributor, 30 starts per
            UTC day, 100 locally retained runs, 10 MB per shared binary result,
            and 100 MB of workshop storage per person. Written results are
            limited to 32 KB. These are limits on activity and storage, not
            guarantees of model cost or output quality.
          </p>
        </section>
      </main>
    </>
  );
}
