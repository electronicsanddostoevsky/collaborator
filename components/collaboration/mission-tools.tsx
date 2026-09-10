'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ToolRequirement } from '@/lib/mission-tools';
export default function MissionTools({
  mission,
  onChange,
}: {
  mission: string;
  onChange: (tools: ToolRequirement[]) => void;
}) {
  const [tools, setTools] = useState<ToolRequirement[]>([]),
    [revision, setRevision] = useState(0),
    [canEdit, setCanEdit] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [id, setId] = useState(''),
    [name, setName] = useState(''),
    [purpose, setPurpose] = useState('');
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/mission-tools?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as {
      requirements: ToolRequirement[];
      revision: number;
      canEdit: boolean;
      error: string;
    };
    if (!r.ok) throw Error(d.error);
    setTools(d.requirements);
    setRevision(d.revision);
    setCanEdit(d.canEdit);
    onChange(d.requirements);
  }, [mission, onChange]);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  async function save(next: ToolRequirement[]) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/mission-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission, revision, requirements: next }),
      });
      const d = (await r.json()) as { error: string };
      if (!r.ok) throw Error(d.error);
      await load();
      setId('');
      setName('');
      setPurpose('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save requirements.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="aside-card">
      <div className="section-heading">
        <h2>This mission’s tools</h2>
        <button
          className="text-button"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
      <p>
        Requirements describe what the mission needs. Your connected computer
        determines which operations are available.
      </p>
      <div className="tool-requirements">
        {tools.map((t) => (
          <article key={t.id}>
            <strong>{t.name}</strong>
            <p>{t.purpose}</p>
            <small>Connection ID: {t.id}</small>
            {canEdit && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => save(tools.filter((x) => x.id !== t.id))}
              >
                Remove requirement
              </button>
            )}
          </article>
        ))}
      </div>
      {!tools.length && (
        <p>
          No tools required yet. The maintainer can add applications or
          services.
        </p>
      )}
      {error && (
        <p role="alert" className="error-note">
          {error}
        </p>
      )}
      {canEdit && (
        <details>
          <summary>Add an application or service</summary>
          <form
            className="update-composer"
            onSubmit={(e) => {
              e.preventDefault();
              save([...tools, { id, name, purpose }]);
            }}
          >
            <label>
              Name
              <input
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Connection ID
              <input
                required
                pattern="[a-z][a-z0-9-]{1,39}"
                placeholder="e.g. weather-api"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </label>
            <label>
              What does this mission need it for?
              <input
                required
                minLength={5}
                maxLength={240}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </label>
            <button className="secondary" disabled={busy || tools.length >= 12}>
              Add requirement
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
