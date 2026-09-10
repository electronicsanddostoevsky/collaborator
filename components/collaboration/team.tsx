'use client';
import { useCallback, useEffect, useState } from 'react';
import { moduleKey } from '@/lib/teams';
type Member = { id: string; name: string; mine: boolean };
type Lead = {
  id: string;
  module: string;
  member_id: string | null;
  revision: number;
};
type TeamState = {
  members: Member[];
  leads: Lead[];
  modules: string[];
  owner: boolean;
  signedIn: boolean;
};
export default function Team({ mission }: { mission: string }) {
  const [data, setData] = useState<TeamState | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [module, setModule] = useState(''),
    [member, setMember] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/team?mission=' + encodeURIComponent(mission));
    const d = (await r.json()) as TeamState & { error: string };
    if (!r.ok) throw Error(d.error);
    setData(d);
  }, [mission]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission, ...payload }),
      });
      const d = (await r.json()) as { error: string };
      if (!r.ok) throw Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update team.');
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return <p role="status">{error || 'Loading mission community…'}</p>;
  const mine = data.members.find((m) => m.mine),
    selected = data.leads.find((l) => l.module === moduleKey(module));
  return (
    <section className="plan-panel">
      <h2>People and responsibility</h2>
      <p>
        Join the mission to propose work. The mission owner keeps overall
        responsibility and can delegate particular subdivisions. Joining does
        not grant permission to run your computer.
      </p>
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
      {!data.signedIn ? (
        <p>Sign in to join this community.</p>
      ) : !mine ? (
        <button
          className="primary"
          disabled={busy}
          onClick={() => act({ operation: 'join' })}
        >
          Join this mission
        </button>
      ) : (
        <p>
          You’re a member.{' '}
          {!data.owner && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => act({ operation: 'leave' })}
            >
              Leave mission
            </button>
          )}
        </p>
      )}
      {data.owner && (
        <p className="workspace-status">
          You are the mission owner and default lead across all subdivisions.
        </p>
      )}
      <h3>Members</h3>
      {!data.members.length ? (
        <p>No one has explicitly joined yet.</p>
      ) : (
        <ul>
          {data.members.map((m) => (
            <li key={m.id}>
              {m.name}
              {m.mine ? ' (you)' : ''}
            </li>
          ))}
        </ul>
      )}
      <h3>Subdivision leads</h3>
      <p>
        A lead can edit or decide a plan only when every task belongs to
        subdivisions they lead. They can review results in their own
        subdivisions. Cross-team plans remain with the owner unless one lead
        covers all their subdivisions.
      </p>
      {!data.leads.length ? (
        <p>No delegated leads yet. The mission owner handles decisions.</p>
      ) : (
        <ul>
          {data.leads.map((l) => (
            <li key={l.id}>
              <strong>{l.module}</strong> —{' '}
              {data.members.find((m) => m.id === l.member_id)?.name ||
                'No delegated lead'}
              {data.owner && l.member_id && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    act({
                      operation: 'lead',
                      module: l.module,
                      memberId: null,
                      revision: l.revision,
                    })
                  }
                >
                  Revoke role
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.owner && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act({
              operation: 'lead',
              module: module.trim(),
              memberId: member,
              revision: selected?.revision || 0,
            });
          }}
        >
          <label>
            Subdivision name
            <input
              list="mission-subdivisions"
              value={module}
              maxLength={80}
              onChange={(e) => setModule(e.target.value)}
              placeholder="For example: lore, art, gameplay"
            />
          </label>
          <datalist id="mission-subdivisions">
            {[
              ...new Set([...data.modules, ...data.leads.map((l) => l.module)]),
            ].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <label>
            Appoint a current member
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Choose a member</option>
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={busy || module.trim().length < 2 || !member}
          >
            Assign subdivision lead
          </button>
          <p>
            Use the same subdivision name as the tasks’ Team / discipline field.
            Assignments and revocations enter mission history.
          </p>
        </form>
      )}
      <p>
        This running pilot is private. People need access to the site before
        they can join; the public source repository is separate.
      </p>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => load().catch((e) => setError(e.message))}
      >
        Refresh community
      </button>
    </section>
  );
}
