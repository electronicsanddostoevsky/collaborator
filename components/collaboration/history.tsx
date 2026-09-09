'use client';
import { useCallback, useEffect, useState } from 'react';
type Entry = {
  id: string;
  kind: string;
  author: string;
  title: string;
  body: string;
  url?: string;
  revision?: number;
  created_at: string;
  snapshot?: Record<string, unknown>;
};
const names: Record<string, string> = {
  brief: 'Mission brief',
  post: 'Conversation',
  submission: 'Contribution',
  review: 'Review',
  'action:create': 'Action added',
  'action:claim': 'Responsibility taken',
  'action:release': 'Action released',
  'action:submit': 'Result submitted',
  'action:accept': 'Result accepted',
  'action:revise': 'Changes requested',
};
const readable = (value: unknown) =>
  Array.isArray(value) ? value.join('\n') : String(value ?? '');
export default function History({ mission }: { mission: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('Everything');
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/history?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as { entries: Entry[]; error: string };
    if (!r.ok) throw Error(d.error);
    setEntries(d.entries);
    setError('');
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  const list = entries?.filter(
    (e) =>
      filter === 'Everything' ||
      (filter === 'Brief versions'
        ? e.kind === 'brief'
        : filter === 'Actions'
          ? e.kind.startsWith('action:')
          : filter === 'Conversations'
            ? e.kind === 'post'
            : ['submission', 'review'].includes(e.kind)),
  );
  return (
    <>
      <div className="history-tools">
        <div className="filter-buttons" aria-label="History categories">
          {[
            'Everything',
            'Brief versions',
            'Actions',
            'Conversations',
            'Contributions',
          ].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="action-buttons">
          <button
            className="text-button"
            onClick={() => load().catch((e) => setError(e.message))}
          >
            Refresh
          </button>
          <a
            className="secondary"
            href={
              '/api/history?mission=' +
              encodeURIComponent(mission) +
              '&download=1'
            }
          >
            Export recent history ↓
          </a>
        </div>
      </div>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {!entries && !error && <p role="status">Loading history…</p>}
      {entries && list?.length === 0 && (
        <p className="update-empty">No recorded changes in this view yet.</p>
      )}
      <div className="mission-timeline">
        {list?.map((e) => {
          const older = e.snapshot
            ? entries
                ?.filter(
                  (v) => v.snapshot && (v.revision || 0) < (e.revision || 0),
                )
                .sort((a, b) => (b.revision || 0) - (a.revision || 0))[0]
            : null;
          return (
            <article className="timeline-item" key={e.id}>
              <div className="update-meta">
                <strong>{names[e.kind] || e.kind}</strong>
                <time dateTime={e.created_at}>
                  {new Date(e.created_at).toLocaleString()}
                </time>
              </div>
              <h2>{e.title}</h2>
              <span className="workspace-status">
                {e.author}
                {e.revision ? ' · Revision ' + e.revision : ''}
              </span>
              <p className="post-body">{e.body}</p>
              {e.url && (
                <a
                  className="text-button"
                  href={e.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open contribution ↗
                </a>
              )}
              {e.snapshot && (
                <details>
                  <summary>
                    Inspect this version
                    {older
                      ? ' and changes since revision ' + older.revision
                      : ''}
                  </summary>
                  <div className="snapshot-fields">
                    {Object.entries(e.snapshot).map(([key, value]) => {
                      const changed =
                        older &&
                        JSON.stringify(older.snapshot?.[key]) !==
                          JSON.stringify(value);
                      return (
                        <div
                          key={key}
                          className={changed ? 'snapshot-changed' : ''}
                        >
                          <strong>
                            {key === 'intent'
                              ? 'Commercial intent'
                              : key.charAt(0).toUpperCase() + key.slice(1)}
                          </strong>
                          {changed && (
                            <div className="previous-value">
                              <span>Previously</span>
                              <p className="post-body">
                                {readable(older.snapshot?.[key])}
                              </p>
                            </div>
                          )}
                          <p className="post-body">{readable(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </div>
      <p className="workspace-status">
        Latest 200 records per category. Brief snapshots begin with this history
        feature; earlier edits cannot be reconstructed. Recorded history is
        preserved when an action is released or a result needs another attempt.
      </p>
    </>
  );
}
