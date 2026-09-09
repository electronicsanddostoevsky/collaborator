'use client';
import { useEffect, useState } from 'react';
import { categories, type MissionInput } from '@/lib/mission-input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
const blank: MissionInput = {
  title: '',
  category: 'Local action',
  description: '',
  outcome: '',
  roles: [''],
  steps: [''],
  intent: 'community',
};
export default function MissionEditor() {
  const [mission, setMission] = useState(blank),
    [roles, setRoles] = useState(''),
    [steps, setSteps] = useState(''),
    [editId, setEditId] = useState<string | null>(null),
    [id] = useState(() => crypto.randomUUID()),
    [revision, setRevision] = useState(1),
    [ready, setReady] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [allowed, setAllowed] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const edit = new URLSearchParams(window.location.search).get('edit');
    setEditId(edit);
    fetch('/api/missions' + (edit ? '?id=' + encodeURIComponent(edit) : ''), {
      cache: 'no-store',
    })
      .then(async (r) => {
        const d = (await r.json()) as {
          error: string;
          signedIn: boolean;
          canEdit: boolean;
          mission: MissionInput & { revision: number };
        };
        if (!r.ok) throw Error(d.error);
        setSignedIn(d.signedIn);
        if (edit) {
          setAllowed(d.canEdit);
          setMission(d.mission);
          setRoles(d.mission.roles.join('\n'));
          setSteps(d.mission.steps.join('\n'));
          setRevision(d.mission.revision);
        }
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);
  function change(key: keyof MissionInput, value: string) {
    setMission((m) => ({ ...m, [key]: value }));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editId ? 'edit' : 'create',
          id: editId || id,
          revision,
          mission: {
            ...mission,
            roles: roles
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            steps: steps
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }),
      });
      const d = (await r.json()) as { id: string; error: string };
      if (!r.ok) throw Error(d.error);
      window.location.assign('/missions/' + d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setBusy(false);
    }
  }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          collaborator ↗
        </a>
        <a className="text-button" href={editId ? '/missions/' + editId : '/'}>
          Back to missions
        </a>
      </header>
      <main className="mission-editor">
        <span className="eyebrow">START WITH A SHARED POSSIBILITY</span>
        <h1>{editId ? 'Shape the next step.' : 'What should happen?'}</h1>
        <p className="intro">
          You don’t need a finished plan. Give people a clear outcome and a
          small way to begin.
        </p>
        {error && (
          <p className="error-note" role="alert">
            {error}
          </p>
        )}
        {!ready ? (
          <p className="body-copy">Loading your workspace…</p>
        ) : !signedIn ? (
          <a
            className="primary"
            href={
              '/signin-with-chatgpt?return_to=' +
              encodeURIComponent(
                '/missions/new' + (editId ? '?edit=' + editId : ''),
              )
            }
            target="_top"
          >
            Sign in to start a mission
          </a>
        ) : !allowed ? (
          <p className="error-note">Only the creator can edit this mission.</p>
        ) : (
          <form onSubmit={save}>
            <label>
              Give the mission a name
              <input
                required
                minLength={5}
                maxLength={100}
                value={mission.title}
                onChange={(e) => change('title', e.target.value)}
                placeholder="Restore our neighborhood’s community garden"
              />
            </label>
            <label htmlFor="mission-category">Where does it fit?</label>
            <Select
              value={mission.category}
              onValueChange={(v) => change('category', String(v))}
            >
              <SelectTrigger id="mission-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label>
              The invitation
              <textarea
                required
                minLength={20}
                maxLength={400}
                rows={3}
                value={mission.description}
                onChange={(e) => change('description', e.target.value)}
                placeholder="Why does this matter, and who might want to help?"
              />
            </label>
            <label>
              What would success look like?
              <textarea
                required
                minLength={20}
                maxLength={2000}
                rows={4}
                value={mission.outcome}
                onChange={(e) => change('outcome', e.target.value)}
                placeholder="Describe the change you want to see. A small first outcome is enough."
              />
            </label>
            <label>
              Ways people can help <span>One per line, up to six</span>
              <textarea
                required
                rows={4}
                maxLength={725}
                value={roles}
                onChange={(e) => setRoles(e.target.value)}
                placeholder={
                  'Volunteer for an afternoon\nBring tools or materials\nHelp organize the first meeting'
                }
              />
            </label>
            <label>
              The next small steps <span>One per line, up to six</span>
              <textarea
                required
                rows={4}
                maxLength={725}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={
                  'Find a few interested people\nAgree on a first plan\nTry it and share what happened'
                }
              />
            </label>
            <fieldset>
              <legend>Declare the mission’s intent</legend>
              <RadioGroup
                value={mission.intent}
                disabled={!!editId}
                onValueChange={(v) => change('intent', String(v))}
              >
                <label className="intent-choice">
                  <RadioGroupItem value="community" />
                  Community · Noncommercial intent
                </label>
                <label className="intent-choice">
                  <RadioGroupItem value="commercial" />
                  Commercial · Explicit contributor terms required
                </label>
              </RadioGroup>
              <p className="field-note">
                This declaration is fixed when the mission is created. It is not
                a license, ownership agreement, or promise of compensation.
              </p>
            </fieldset>
            <p className="field-note">
              Your mission will appear in this private site’s feed.
              Participation records interest, not a booking or financial
              commitment. No money is collected.
            </p>
            <button className="primary" disabled={busy}>
              {busy ? 'Saving…' : editId ? 'Save revision' : 'Create mission'}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
