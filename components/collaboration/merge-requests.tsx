'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FileChange } from '@/lib/merge-files';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
type Proposal = {
  id: string;
  source: string;
  target: string;
  source_head: string;
  target_head: string;
  title: string;
  description: string;
  author: string;
  status: string;
  feedback: string;
  reviewer: string | null;
  merge_head: string | null;
  resolutions: string;
};
type Detail = {
  proposal: Proposal;
  changes: FileChange[];
  conflicts: number;
  canReview: boolean;
  canClose: boolean;
  error: string;
};
function Review({
  proposal,
  mission,
  onSaved,
}: {
  proposal: Proposal;
  mission: string;
  onSaved: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<Detail | null>(null),
    [feedback, setFeedback] = useState(''),
    [resolutions, setResolutions] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch(
      '/api/merge-requests?mission=' +
        encodeURIComponent(mission) +
        '&id=' +
        proposal.id,
      { cache: 'no-store' },
    );
    const d = (await r.json()) as Detail;
    if (!r.ok) throw Error(d.error);
    setDetail(d);
    if (d.proposal.status !== 'pending')
      setResolutions(JSON.parse(d.proposal.resolutions || '{}'));
  }
  async function decide(operation: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/merge-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proposal.id,
          mission,
          operation,
          feedback,
          resolutions,
        }),
      });
      const d = (await r.json()) as { error: string };
      if (!r.ok) throw Error(d.error);
      await onSaved();
      await load();
      setFeedback('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="update-card">
      <div className="update-meta">
        <strong>
          {proposal.source === mission ? 'Outgoing' : 'Incoming'} ·{' '}
          {proposal.status}
        </strong>
        <span>{proposal.author}</span>
      </div>
      <h2>{proposal.title}</h2>
      <p className="post-body">{proposal.description}</p>
      <a
        className="text-button"
        href={
          '/missions/' +
          (proposal.source === mission ? proposal.target : proposal.source) +
          '/workspace'
        }
      >
        Open {proposal.source === mission ? 'upstream' : 'contributor'}{' '}
        workspace ↗
      </a>
      <details
        className="action-history"
        onToggle={(e) => {
          if (e.currentTarget.open) load().catch((e) => setError(e.message));
        }}
      >
        <summary>Compare files & review</summary>
        {!detail ? (
          <p>Loading comparison…</p>
        ) : (
          <>
            <p className="workspace-status">
              This comparison records fixed source and upstream versions. Later
              fork edits do not change this proposal.
            </p>
            {detail.changes.map((c) => (
              <section className="merge-file" key={c.path}>
                <h3>
                  {c.path} ·{' '}
                  {c.conflict
                    ? 'Needs resolution'
                    : c.proposed === null
                      ? 'Remove file'
                      : c.before === null
                        ? 'Add file'
                        : 'Update file'}
                </h3>
                <div className="merge-columns">
                  <div>
                    <strong>Current upstream at proposal time</strong>
                    <pre>{c.current ?? '(file absent)'}</pre>
                  </div>
                  <div>
                    <strong>Proposed from fork</strong>
                    <pre>{c.proposed ?? '(remove file)'}</pre>
                  </div>
                </div>
                {c.conflict && (
                  <details>
                    <summary>Original shared version</summary>
                    <pre>{c.before ?? '(file absent)'}</pre>
                  </details>
                )}
                {c.conflict &&
                  detail.canReview &&
                  detail.proposal.status === 'pending' && (
                    <Select
                      value={resolutions[c.path] || null}
                      disabled={busy}
                      onValueChange={(v) =>
                        setResolutions({ ...resolutions, [c.path]: String(v) })
                      }
                    >
                      <SelectTrigger aria-label={'Resolve ' + c.path}>
                        <SelectValue placeholder="Choose which version to keep" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">
                          Keep upstream version
                        </SelectItem>
                        <SelectItem value="proposed">
                          Use fork’s proposed version
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                {c.conflict && detail.proposal.status === 'merged' && (
                  <p className="workspace-status">
                    Resolution:{' '}
                    {resolutions[c.path] === 'current'
                      ? 'kept upstream version'
                      : 'used proposed version'}
                  </p>
                )}
              </section>
            ))}
            {detail.conflicts > 0 && (
              <p className="error-note">
                Some files changed on both sides. The upstream reviewer must
                explicitly choose which version to keep for each conflict.
              </p>
            )}
            {detail.proposal.status === 'pending' && detail.canClose && (
              <form
                className="update-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  decide('merge');
                }}
              >
                <label>
                  Review note
                  <textarea
                    required
                    minLength={5}
                    maxLength={2000}
                    value={feedback}
                    disabled={busy}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Explain why this is ready, or why you are closing it."
                  />
                </label>
                <div className="action-buttons">
                  {detail.canReview && (
                    <button
                      className="primary"
                      disabled={
                        busy ||
                        detail.changes.some(
                          (c) => c.conflict && !resolutions[c.path],
                        )
                      }
                    >
                      Merge reviewed files
                    </button>
                  )}
                  <button
                    className="secondary"
                    type="button"
                    disabled={busy || feedback.trim().length < 5}
                    onClick={() => decide('close')}
                  >
                    Close proposal
                  </button>
                </div>
              </form>
            )}
            {detail.proposal.feedback && (
              <p className="post-body">
                {detail.proposal.reviewer}: {detail.proposal.feedback}
              </p>
            )}
            {detail.proposal.merge_head && (
              <p className="workspace-status">
                Merged as {detail.proposal.merge_head.slice(0, 12)}
              </p>
            )}
          </>
        )}
      </details>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
export default function MergeRequests({ mission }: { mission: string }) {
  const [data, setData] = useState<{
      proposals: Proposal[];
      upstream: string | null;
      sourceHead: string;
      canPropose: boolean;
    } | null>(null),
    [title, setTitle] = useState(''),
    [description, setDescription] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const id = useRef<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/merge-requests?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as NonNullable<typeof data> & { error: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
    setError('');
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  return (
    <>
      <div className="section-heading">
        <h2>Share work between missions</h2>
        <button
          className="text-button"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
      <p className="body-copy">
        Propose a fork’s working-file changes to its upstream mission. Mission
        briefs, intent, people, and conversations stay independent.
      </p>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p>Loading proposals…</p>}
      {data?.canPropose && (
        <details className="action-create">
          <summary>
            Propose my changes upstream <span>↗</span>
          </summary>
          <form
            className="update-composer"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              id.current ??= crypto.randomUUID();
              try {
                const r = await fetch('/api/merge-requests', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: id.current,
                    mission,
                    sourceHead: data.sourceHead,
                    operation: 'propose',
                    title,
                    description,
                  }),
                });
                const d = (await r.json()) as { error: string };
                if (!r.ok) throw Error(d.error);
                id.current = null;
                setTitle('');
                setDescription('');
                await load();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Could not propose changes.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              What are you contributing?
              <input
                required
                minLength={5}
                maxLength={120}
                disabled={busy}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  id.current = null;
                }}
              />
            </label>
            <label>
              Why should these changes join the shared version?
              <textarea
                required
                minLength={10}
                maxLength={3000}
                disabled={busy}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  id.current = null;
                }}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Submit for review'}
            </button>
          </form>
        </details>
      )}
      {data?.proposals.length === 0 && (
        <p className="update-empty">
          No proposals yet. A fork’s creator can share working-file changes here
          when they are ready.
        </p>
      )}
      {data?.proposals.map((p) => (
        <Review key={p.id} proposal={p} mission={mission} onSaved={load} />
      ))}
    </>
  );
}
