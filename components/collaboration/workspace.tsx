'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Check, RefreshCw } from 'lucide-react';
export type Proposal = {
  id: string;
  task_id: string;
  name: string;
  title: string;
  body: string;
  url: string;
  status: string;
  feedback: string;
  created_at: string;
  revision: number | null;
  mine: boolean;
};
export type Workspace = {
  user: { name: string; isMaintainer: boolean } | null;
  maintainerConfigured: boolean;
  claims: { taskId: string; name: string; mine: boolean }[];
  proposals: Proposal[];
  following: boolean;
  supporters: number;
};
export function useWorkspace() {
  const [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/collaboration', { cache: 'no-store' });
      const value = (await r.json()) as Workspace & { error: string };
      if (!r.ok) throw Error(value.error);
      setData(value);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load workspace.');
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function act(payload: unknown) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const value = (await r.json()) as Workspace & { error: string };
      if (!r.ok) throw Error(value.error);
      setData(value);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { data, error, busy, act, refresh };
}
export type Controller = ReturnType<typeof useWorkspace>;
export function ContributionForm({
  taskId,
  workspace,
}: {
  taskId: string;
  workspace: Controller;
}) {
  const { data, busy, act, error } = workspace;
  const [title, setTitle] = useState(''),
    [body, setBody] = useState(''),
    [url, setUrl] = useState(''),
    [id, setId] = useState(() => crypto.randomUUID()),
    [sent, setSent] = useState(false);
  const claim = data?.claims.find((c) => c.taskId === taskId);
  const pending = data?.proposals.find(
    (p) => p.task_id === taskId && p.mine && p.status === 'pending',
  );
  return (
    <div className="contribution-form">
      {!data ? (
        <p>Loading contribution workspace…</p>
      ) : !data.user ? (
        <p>Sign in through the site to contribute.</p>
      ) : (
        <>
          <p className="identity-line">
            Contributing as <strong>{data.user.name}</strong>
          </p>
          {claim?.mine ? (
            <>
              <div className="claim-line">
                <span>
                  <Check size={16} />
                  You claimed this task
                </span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => act({ action: 'release', taskId })}
                >
                  Release task
                </button>
              </div>
              {pending ? (
                <p className="success-note">
                  Your contribution is awaiting maintainer review. You can find
                  it in Contributions.
                </p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await act({
                        action: 'submit',
                        taskId,
                        id,
                        title,
                        body,
                        url,
                      })
                    ) {
                      setSent(true);
                      setTitle('');
                      setBody('');
                      setUrl('');
                      setId(crypto.randomUUID());
                    }
                  }}
                >
                  <label>
                    Contribution title
                    <input
                      required
                      minLength={3}
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="A source-grounded approach to Gandiva"
                    />
                  </label>
                  <label>
                    Your contribution
                    <textarea
                      required
                      minLength={20}
                      maxLength={10000}
                      rows={6}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Share your work, references, and why it fits the brief…"
                    />
                  </label>
                  <label>
                    Artifact link <span>(optional)</span>
                    <input
                      type="url"
                      maxLength={2000}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </label>
                  <p className="field-note">
                    Use your own work or material you have permission to share.
                    This is a private pilot; public contribution terms are not
                    finalized. External files remain at their original links.
                  </p>
                  <button className="primary" disabled={busy} type="submit">
                    {busy ? 'Saving…' : 'Submit for review'}
                  </button>
                </form>
              )}
            </>
          ) : claim ? (
            <p className="field-note">
              {claim.name} has claimed this task. You can still explore the
              brief and prepare ideas.
            </p>
          ) : (
            <button
              className="primary"
              disabled={busy}
              onClick={() => act({ action: 'claim', taskId })}
            >
              {busy ? 'Saving…' : 'Claim this task'}
            </button>
          )}
          {sent && !pending && (
            <p className="success-note">Contribution saved.</p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
    </div>
  );
}
function ReviewCard({
  proposal: p,
  workspace,
}: {
  proposal: Proposal;
  workspace: Controller;
}) {
  const [feedback, setFeedback] = useState('');
  return (
    <article className="proposal-card">
      <div className="proposal-meta">
        <span className={'status ' + p.status}>
          {p.status.replaceAll('_', ' ')}
        </span>
        <span>
          {p.name} · {new Date(p.created_at).toLocaleDateString()}
        </span>
        {p.revision && <span>Revision {p.revision}</span>}
      </div>
      <h3>{p.title}</h3>
      <p className="submitted-body">{p.body}</p>
      {p.url && (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-button"
        >
          Open contributed artifact
          <ArrowUpRight size={15} />
        </a>
      )}
      {p.feedback && (
        <blockquote>
          <strong>Maintainer review</strong>
          <p>{p.feedback}</p>
        </blockquote>
      )}
      {workspace.data?.user?.isMaintainer && p.status === 'pending' && (
        <div className="review-form">
          <label htmlFor={'review-' + p.id}>Review note</label>
          <textarea
            id={'review-' + p.id}
            rows={3}
            maxLength={2000}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Explain what fits the vision, or what needs to change."
          />
          <div className="review-actions">
            <button
              className="primary"
              disabled={workspace.busy || !feedback.trim()}
              onClick={() =>
                workspace.act({
                  action: 'review',
                  id: p.id,
                  status: 'accepted',
                  feedback,
                })
              }
            >
              Accept contribution
            </button>
            <button
              className="secondary"
              disabled={workspace.busy || !feedback.trim()}
              onClick={() =>
                workspace.act({
                  action: 'review',
                  id: p.id,
                  status: 'changes_requested',
                  feedback,
                })
              }
            >
              Request changes
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
export function Contributions({
  workspace,
  acceptedOnly = false,
}: {
  workspace: Controller;
  acceptedOnly?: boolean;
}) {
  const proposals =
    workspace.data?.proposals.filter(
      (p) => !acceptedOnly || p.status === 'accepted',
    ) || [];
  return (
    <div className="contributions">
      <div className="section-heading">
        <h2>
          {acceptedOnly ? 'Accepted contributions' : 'Contributions & review'}
        </h2>
        <button className="text-button" onClick={() => workspace.refresh()}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      {!workspace.data?.maintainerConfigured && workspace.data && (
        <p className="field-note">
          Maintainer setup is pending. Contributions can be submitted, but
          approval is not yet enabled.
        </p>
      )}
      {workspace.error && (
        <p className="error-note" role="alert">
          {workspace.error}
        </p>
      )}
      {!workspace.data ? (
        <p>Loading shared activity…</p>
      ) : proposals.length === 0 ? (
        <div className="empty-build">
          <h3>
            {acceptedOnly
              ? 'The first accepted contribution starts the history.'
              : 'No contributions yet. Yours can be the first.'}
          </h3>
          <p>Claim a task in Ways to help, then submit your work for review.</p>
        </div>
      ) : (
        proposals.map((p) => (
          <ReviewCard key={p.id} proposal={p} workspace={workspace} />
        ))
      )}
    </div>
  );
}
