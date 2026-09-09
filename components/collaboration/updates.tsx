'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
type Post = {
  id: string;
  author: string;
  kind: string;
  body: string;
  parent_id: string | null;
  created_at: string;
};
type State = {
  posts: Post[];
  canPost: boolean;
  canReply: boolean;
  signedIn: boolean;
};
const labels: Record<string, string> = {
  progress: 'Progress',
  question: 'Open question',
  next_step: 'Next step',
  reply: 'Reply',
};
function Composer({
  mission,
  parentId,
  onSaved,
}: {
  mission: string;
  parentId?: string;
  onSaved: () => Promise<void>;
}) {
  const [body, setBody] = useState(''),
    [kind, setKind] = useState('progress'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const draft = useRef<string | null>(null);
  return (
    <form
      className="update-composer"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        draft.current ??= crypto.randomUUID();
        try {
          const r = await fetch('/api/updates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: draft.current,
              mission,
              kind: parentId ? 'reply' : kind,
              body,
              parentId,
            }),
          });
          const d = (await r.json()) as { error: string };
          if (!r.ok) throw Error(d.error);
          setBody('');
          draft.current = null;
          await onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {!parentId && (
        <Select
          value={kind}
          onValueChange={(v) => {
            setKind(String(v));
            draft.current = null;
          }}
          disabled={busy}
        >
          <SelectTrigger aria-label="Update type">
            <SelectValue>{labels[kind]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {['progress', 'question', 'next_step'].map((k) => (
              <SelectItem key={k} value={k}>
                {labels[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <label>
        {parentId ? 'Your reply' : 'What should the mission know?'}
        <textarea
          required
          minLength={3}
          maxLength={4000}
          value={body}
          disabled={busy}
          onChange={(e) => {
            setBody(e.target.value);
            draft.current = null;
          }}
          placeholder={
            parentId
              ? 'Offer an answer, an idea, or a little help…'
              : 'Share what happened and what people can help with next…'
          }
        />
      </label>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy}>
        {busy ? 'Saving…' : parentId ? 'Send reply' : 'Publish update'}
      </button>
      <span className="workspace-status">
        Visible to everyone with access to this mission. Posts cannot be edited
        in this pilot.
      </span>
    </form>
  );
}
export default function Updates({ mission }: { mission: string }) {
  const [state, setState] = useState<State | null>(null),
    [error, setError] = useState(''),
    [reply, setReply] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/updates?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as State & { error: string };
    if (!r.ok) throw Error(d.error);
    setState(d);
    setError('');
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
    const refresh = () => load().catch((e) => setError(e.message));
    window.addEventListener('mission-participation-changed', refresh);
    return () =>
      window.removeEventListener('mission-participation-changed', refresh);
  }, [load]);
  return (
    <section className="mission-updates">
      <div className="section-heading">
        <h2>Updates & conversation</h2>
        <button
          className="text-button"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
      <p className="body-copy">
        Progress, open questions, and the next thing we can do together.
      </p>
      {error && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
      {!state && !error && <p role="status">Loading updates…</p>}
      {state?.canPost && <Composer mission={mission} onSaved={load} />}
      {state && !state.signedIn && (
        <a
          className="secondary"
          href={
            '/signin-with-chatgpt?return_to=' +
            encodeURIComponent(
              mission === 'mahabharata'
                ? '/mahabharata'
                : '/missions/' + mission,
            )
          }
        >
          Sign in to participate
        </a>
      )}
      {state?.signedIn && !state.canReply && (
        <p className="workspace-status">
          Follow this mission or express interest in a role to join the
          conversation.
        </p>
      )}
      {state && state.posts.length === 0 && (
        <div className="update-empty">
          No updates yet. This is where the mission’s next chapter will take
          shape.
        </div>
      )}
      {state?.posts
        .filter((p) => !p.parent_id)
        .map((p) => (
          <article className="update-card" key={p.id}>
            <div className="update-meta">
              <strong>{labels[p.kind]}</strong>
              <span>
                {p.author} ·{' '}
                <time dateTime={p.created_at}>
                  {new Date(p.created_at).toLocaleDateString()}
                </time>
              </span>
            </div>
            <p className="post-body">{p.body}</p>
            {state.posts
              .filter((r) => r.parent_id === p.id)
              .reverse()
              .map((r) => (
                <div className="update-reply" key={r.id}>
                  <div className="update-meta">
                    <strong>{r.author}</strong>
                    <time dateTime={r.created_at}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="post-body">{r.body}</p>
                </div>
              ))}
            {state.canReply && (
              <button
                className="text-button"
                aria-expanded={reply === p.id}
                onClick={() => setReply(reply === p.id ? null : p.id)}
              >
                {reply === p.id ? 'Close reply' : 'Reply'}
              </button>
            )}
            {reply === p.id && state.canReply && (
              <Composer mission={mission} parentId={p.id} onSaved={load} />
            )}
          </article>
        ))}
      <p className="workspace-status">
        Showing recent updates. Refresh to check for new activity.
      </p>
    </section>
  );
}
