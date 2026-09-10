'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  actionKinds,
  actionEfforts,
  type ActionRecord,
  type ActionEvent,
} from '@/lib/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress, ProgressLabel } from '@/components/ui/progress';
type State = { actions: ActionRecord[]; canManage: boolean; signedIn: boolean };
const states: Record<string, string> = {
  open: 'Ready to take',
  doing: 'In progress',
  review: 'Ready for review',
  done: 'Done',
};
const eventNames: Record<string, string> = {
  create: 'Action added',
  claim: 'Took responsibility',
  release: 'Made available again',
  submit: 'Submitted a result',
  accept: 'Accepted result',
  revise: 'Requested changes',
};
async function request(payload: Record<string, unknown>) {
  const r = await fetch('/api/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const d = (await r.json()) as { error: string };
  if (!r.ok) throw Error(d.error);
}
function Choice({
  value,
  values,
  onChange,
  label,
}: {
  value: string;
  values: string[];
  onChange: (s: string) => void;
  label: string;
}) {
  return (
    <div className="action-field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => onChange(String(v))}>
        <SelectTrigger aria-label={label}>
          <SelectValue>{value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {values.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function NewAction({
  mission,
  onSaved,
}: {
  mission: string;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(''),
    [brief, setBrief] = useState(''),
    [doneWhen, setDone] = useState(''),
    [kind, setKind] = useState(actionKinds[0]),
    [effort, setEffort] = useState(actionEfforts[0]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const ids = useRef<{ id: string; eventId: string } | null>(null);
  return (
    <details className="action-create">
      <summary>
        Add a concrete action <span>+</span>
      </summary>
      <form
        className="update-composer"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          ids.current ??= {
            id: crypto.randomUUID(),
            eventId: crypto.randomUUID(),
          };
          try {
            await request({
              ...ids.current,
              mission,
              operation: 'create',
              title,
              brief,
              doneWhen,
              kind,
              effort,
            });
            ids.current = null;
            setTitle('');
            setBrief('');
            setDone('');
            await onSaved();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            One thing someone could do
            <input
              required
              minLength={5}
              maxLength={120}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                ids.current = null;
              }}
              placeholder="Find a local waste collection partner"
            />
          </label>
          <label>
            What would help?
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={brief}
              onChange={(e) => {
                setBrief(e.target.value);
                ids.current = null;
              }}
              placeholder="Give someone enough context to get started."
            />
          </label>
          <label>
            How will we know it’s done?
            <textarea
              required
              minLength={10}
              maxLength={1000}
              value={doneWhen}
              onChange={(e) => {
                setDone(e.target.value);
                ids.current = null;
              }}
              placeholder="For example: share collection options and confirm which materials they accept."
            />
          </label>
          <div className="action-choices">
            <Choice
              label="Contribution"
              values={actionKinds}
              value={kind}
              onChange={(v) => {
                setKind(v);
                ids.current = null;
              }}
            />
            <Choice
              label="Time to allow"
              values={actionEfforts}
              value={effort}
              onChange={(v) => {
                setEffort(v);
                ids.current = null;
              }}
            />
          </div>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Make action available'}
          </button>
        </fieldset>
        {error && (
          <p className="error-note" role="alert">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
function ActionCard({
  a,
  canManage,
  signedIn,
  onSaved,
}: {
  a: ActionRecord;
  canManage: boolean;
  signedIn: boolean;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [body, setBody] = useState(''),
    [url, setUrl] = useState(''),
    [events, setEvents] = useState<ActionEvent[] | null>(null);
  const attempt = useRef<{ id: string; operation: string } | null>(null);
  const loadHistory = async () => {
    const r = await fetch(
      '/api/actions?mission=' +
        encodeURIComponent(a.mission) +
        '&action=' +
        a.id,
      { cache: 'no-store' },
    );
    const d = (await r.json()) as { events: ActionEvent[]; error: string };
    if (!r.ok) throw Error(d.error);
    setEvents(d.events);
  };
  async function act(operation: string) {
    setBusy(true);
    setError('');
    if (attempt.current?.operation !== operation)
      attempt.current = { id: crypto.randomUUID(), operation };
    try {
      await request({
        id: a.id,
        eventId: attempt.current.id,
        mission: a.mission,
        revision: a.revision,
        operation,
        body,
        url,
      });
      attempt.current = null;
      setBody('');
      setUrl('');
      await onSaved();
      if (events) await loadHistory();
      window.dispatchEvent(new Event('mission-participation-changed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={'action-card action-' + a.status}>
      <div className="update-meta">
        <strong>{states[a.status]}</strong>
        <span>{a.effort}</span>
      </div>
      <h3>{a.title}</h3>
      {a.module && <p className="small-label">{a.module}</p>}
      {!!a.blocked && a.status === 'open' && (
        <p className="workspace-status">
          Waiting for {a.blocked} prerequisite task(s) to be accepted.
        </p>
      )}
      <span className="small-label">{a.kind}</span>
      <p className="post-body">{a.brief}</p>
      <div className="definition-done">
        <strong>Done means</strong>
        <p>{a.done_when}</p>
      </div>
      {a.assignee_name && (
        <p className="workspace-status">
          {a.mine
            ? 'You’re taking this forward'
            : a.assignee_name + ' is taking this forward'}
        </p>
      )}
      {a.status === 'open' && signedIn && (
        <button
          className="primary"
          disabled={busy}
          onClick={() => !a.blocked && act('claim')}
        >
          I can take this on
        </button>
      )}
      {a.mine && a.status === 'doing' && (
        <form
          className="update-composer"
          onSubmit={(e) => {
            e.preventDefault();
            act('submit');
          }}
        >
          <label>
            What happened?
            <textarea
              required
              minLength={10}
              maxLength={4000}
              value={body}
              disabled={busy}
              onChange={(e) => {
                setBody(e.target.value);
                attempt.current = null;
              }}
              placeholder="Describe your result and anything the mission should know."
            />
          </label>
          <label>
            Result link (optional)
            <input
              type="url"
              maxLength={1500}
              value={url}
              disabled={busy}
              onChange={(e) => {
                setUrl(e.target.value);
                attempt.current = null;
              }}
              placeholder="https://…"
            />
          </label>
          <div className="action-buttons">
            <button className="primary" disabled={busy}>
              Submit result
            </button>
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => act('release')}
            >
              Let someone else take it
            </button>
          </div>
        </form>
      )}
      {a.status === 'review' && (canManage || a.canReview) && (
        <form
          className="update-composer"
          onSubmit={(e) => {
            e.preventDefault();
            act('accept');
          }}
        >
          <p>
            Read the submitted result in the action history before reviewing.
          </p>
          <label>
            Your review
            <textarea
              required
              minLength={10}
              maxLength={4000}
              value={body}
              disabled={busy}
              onChange={(e) => {
                setBody(e.target.value);
                attempt.current = null;
              }}
              placeholder="Explain what meets the brief, or what still needs work."
            />
          </label>
          <div className="action-buttons">
            <button className="primary" disabled={busy}>
              Accept as done
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy || body.trim().length < 10}
              onClick={() => act('revise')}
            >
              Request changes
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      <details
        className="action-history"
        onToggle={(e) => {
          if (e.currentTarget.open)
            loadHistory().catch((e) => setError(e.message));
        }}
      >
        <summary>Action history · {a.revision} changes</summary>
        {!events ? (
          <p>Loading history…</p>
        ) : (
          events.map((event) => (
            <div className="history-entry" key={event.id}>
              <div className="update-meta">
                <strong>{eventNames[event.kind]}</strong>
                <span>
                  #{event.revision} · {event.author} ·{' '}
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
              {event.body && <p className="post-body">{event.body}</p>}
              {event.url && (
                <a
                  className="text-button"
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open submitted result ↗
                </a>
              )}
            </div>
          ))
        )}
      </details>
    </article>
  );
}
export default function Actions({ mission }: { mission: string }) {
  const [data, setData] = useState<State | null>(null),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('All');
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/actions?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as State & { error: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
    setError('');
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  const done = data?.actions.filter((a) => a.status === 'done').length || 0;
  const list =
    data?.actions.filter(
      (a) =>
        filter === 'All' ||
        (filter === 'Mine' ? a.mine : states[a.status] === filter),
    ) || [];
  return (
    <section id="actions" className="mission-actions">
      <div className="section-heading">
        <h2>Move this mission forward</h2>
        <button
          className="text-button"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
      <p className="body-copy">
        Take one clear action. Share your result. Build on what others have
        done.
      </p>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading actions…</p>}
      {data && (
        <>
          <Progress
            value={data.actions.length ? (100 * done) / data.actions.length : 0}
          >
            <ProgressLabel>
              {done} of {data.actions.length} actions completed
            </ProgressLabel>
          </Progress>
          {data.canManage && <NewAction mission={mission} onSaved={load} />}
          <div
            className="filter-buttons action-filters"
            aria-label="Filter actions"
          >
            {[
              'All',
              'Ready to take',
              'Mine',
              'In progress',
              'Ready for review',
              'Done',
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
          {!data.signedIn && (
            <a
              className="secondary"
              target="_top"
              href={
                '/signin-with-chatgpt?return_to=' +
                encodeURIComponent('/missions/' + mission)
              }
            >
              Sign in to take part
            </a>
          )}
          {list.length === 0 && (
            <p className="update-empty">
              {data.actions.length
                ? 'No actions in this view.'
                : data.canManage
                  ? 'Start with one small action that someone can finish.'
                  : 'The creator hasn’t added concrete actions yet. You can still express interest below.'}
            </p>
          )}
          <div className="action-list">
            {list.map((a) => (
              <ActionCard
                key={a.id}
                a={a}
                canManage={data.canManage}
                signedIn={data.signedIn}
                onSaved={load}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
