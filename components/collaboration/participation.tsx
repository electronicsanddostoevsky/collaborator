'use client';
import { useCallback, useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
type State = {
  signedIn: boolean;
  counts: { role: string; count: number }[];
  own: { role: string; note: string } | null;
};
export default function Participation({
  mission,
  roles,
}: {
  mission: string;
  roles: string[];
}) {
  const [state, setState] = useState<State | null>(null),
    [role, setRole] = useState(roles[0]),
    [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/participation?mission=' + mission, {
      cache: 'no-store',
    });
    const d = (await r.json()) as State & { error: string };
    if (!r.ok) throw Error(d.error);
    setState(d);
    if (d.own) {
      setRole(d.own.role);
      setNote(d.own.note);
    }
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  async function save(action: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, mission, role, note }),
      });
      const d = (await r.json()) as { error: string };
      if (!r.ok) throw Error(d.error);
      if (action === 'withdraw') setNote('');
      await load();
      setMessage(
        action === 'withdraw'
          ? 'Your interest has been withdrawn.'
          : 'Your interest is saved. This is not a confirmed booking.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-heading">
        <h2>How could you help?</h2>
        <span className="small-label">EXPRESS INTEREST</span>
      </div>
      <p className="body-copy">
        Choose a way you might contribute. Your note is private to your account
        in this pilot; the mission shows only totals by role.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save('interest');
        }}
      >
        <RadioGroup
          value={role}
          onValueChange={(v) => setRole(String(v))}
          className="participation-options"
        >
          {roles.map((r, i) => (
            <label key={r} htmlFor={'role-' + i}>
              <RadioGroupItem id={'role-' + i} value={r} />
              <span>{r}</span>
              <small>
                {state?.counts.find((c) => c.role === r)?.count || 0} interested
              </small>
            </label>
          ))}
        </RadioGroup>
        <label className="participation-note">
          A note for yourself <span>(optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What could you bring, or what would you need to know first?"
          />
        </label>
        {state?.signedIn ? (
          <div className="review-actions">
            <button className="primary" disabled={busy}>
              {busy
                ? 'Saving…'
                : state.own
                  ? 'Update my interest'
                  : 'I’d like to help'}
            </button>
            {state.own && (
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() => save('withdraw')}
              >
                Withdraw my interest
              </button>
            )}
          </div>
        ) : state ? (
          <a
            className="primary"
            href={
              '/signin-with-chatgpt?return_to=' +
              encodeURIComponent('/missions/' + mission)
            }
            target="_top"
          >
            Sign in to take part
          </a>
        ) : (
          <p>Loading participation…</p>
        )}
      </form>
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-note" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
