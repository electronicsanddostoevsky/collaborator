'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
type State = {
  head: string;
  files: Record<string, string>;
  canEdit: boolean;
  forkPolicy: string;
  error: string;
};
export default function Files({ mission }: { mission: string }) {
  const [data, setData] = useState<State | null>(null),
    [selected, setSelected] = useState('mission.json'),
    [path, setPath] = useState(''),
    [content, setContent] = useState(''),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch(
      '/api/workspace?mission=' + encodeURIComponent(mission),
      { cache: 'no-store' },
    );
    const d = (await r.json()) as State;
    if (!r.ok) throw Error(d.error);
    setData(d);
    return d;
  }, [mission]);
  useEffect(() => {
    load()
      .then((d) => setContent(d.files['mission.json']))
      .catch((e) => setError(e.message));
  }, [load]);
  const editable =
    !!data?.canEdit &&
    !['mission.json', 'mission-tools.json'].includes(selected);
  const dirty =
    selected === '__new__'
      ? !!content || !!path
      : content !== (data?.files[selected] || '');
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  async function save(operation: string) {
    if (!data) return;
    setBusy(true);
    setError('');
    setNotice('');
    requestId.current ??= crypto.randomUUID();
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId.current,
          mission,
          base: data.head,
          operation,
          path: selected === '__new__' ? path : selected,
          content,
          message,
        }),
      });
      const d = (await r.json()) as { error: string };
      if (!r.ok) throw Error(d.error);
      const updated = await load();
      requestId.current = null;
      const next =
        operation === 'delete'
          ? 'mission.json'
          : selected === '__new__'
            ? path
            : selected;
      setSelected(next);
      setContent(updated.files[next] || '');
      setMessage('');
      setPath('');
      setNotice(
        operation === 'delete'
          ? 'File removed in a new commit. Earlier versions remain in Git.'
          : 'Saved as a new Git commit.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="file-workspace">
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="workspace-status" role="status">
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">Loading working files…</p>}
      {data && (
        <>
          <div className="workspace-toolbar">
            <a
              className="secondary"
              href={'/missions/' + mission + '/proposals'}
            >
              Proposed contributions →
            </a>
            <Select
              value={selected}
              disabled={busy || dirty}
              onValueChange={(v) => {
                const name = String(v);
                setSelected(name);
                setContent(data.files[name] || '');
                setPath('');
                setMessage('');
                requestId.current = null;
                setNotice('');
              }}
            >
              <SelectTrigger aria-label="Working file">
                <SelectValue>
                  {selected === '__new__' ? 'New working file' : selected}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.keys(data.files)
                  .sort()
                  .map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                {data.canEdit && (
                  <SelectItem value="__new__">+ New working file</SelectItem>
                )}
              </SelectContent>
            </Select>
            <code>main · {data.head.slice(0, 12)}</code>
            <a
              className="text-button"
              href={'/missions/' + mission + '/history'}
            >
              History & forks →
            </a>
          </div>
          {!data.canEdit && (
            <p className="body-copy">
              Read the shared files here.{' '}
              {data.forkPolicy === 'allowed'
                ? 'Fork the mission to develop a different direction.'
                : 'The mission creator maintains these files.'}
            </p>
          )}
          {selected === 'mission.json' && (
            <p className="body-copy">
              This file reflects the mission brief. Its contents are maintained
              through mission revisions.
            </p>
          )}
          {dirty && (
            <p className="workspace-status">
              Unsaved draft. Save or discard it before switching files.
            </p>
          )}
          <form
            className="file-editor"
            onSubmit={(e) => {
              e.preventDefault();
              save('save');
            }}
          >
            {selected === '__new__' && (
              <label>
                Filename
                <input
                  required
                  maxLength={90}
                  value={path}
                  disabled={busy}
                  onChange={(e) => {
                    setPath(e.target.value);
                    requestId.current = null;
                  }}
                  placeholder="design-notes.md"
                />
              </label>
            )}
            <label>
              {selected === '__new__' ? 'File contents' : selected}
              <textarea
                className="source-editor"
                value={content}
                readOnly={!editable}
                disabled={busy}
                spellCheck={false}
                onChange={(e) => {
                  setContent(e.target.value);
                  requestId.current = null;
                }}
                aria-label="File contents"
              />
            </label>
            {editable && (
              <>
                <label>
                  What changed?
                  <input
                    required
                    minLength={5}
                    maxLength={200}
                    value={message}
                    disabled={busy}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      requestId.current = null;
                    }}
                    placeholder="Describe this revision for the next person"
                  />
                </label>
                <div className="action-buttons">
                  <button className="primary" disabled={busy}>
                    {busy ? 'Saving revision…' : 'Save file revision'}
                  </button>
                  {dirty && (
                    <button
                      className="text-button"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setContent(data.files[selected] || '');
                        setPath('');
                        setMessage('');
                        requestId.current = null;
                      }}
                    >
                      Discard draft
                    </button>
                  )}
                </div>
                {selected !== '__new__' && (
                  <details className="action-history">
                    <summary>Remove this file from the current version</summary>
                    <p className="body-copy">
                      Earlier versions remain in Git. Write a change description
                      above, then remove the file.
                    </p>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy || message.trim().length < 5}
                      onClick={() => {
                        requestId.current = null;
                        save('delete');
                      }}
                    >
                      Remove file in a new commit
                    </button>
                  </details>
                )}
              </>
            )}
          </form>
          <div className="workspace-footer">
            <p className="workspace-status">
              Small text files only: notes, code, data, and text-based design
              such as OpenSCAD. Up to 12 working files, 16 KB each, 64 KB total.
              Files are stored and versioned; they are not executed here.
            </p>
            <button
              className="text-button"
              disabled={busy || dirty}
              onClick={() =>
                load()
                  .then((d) => {
                    setContent(d.files[selected] || '');
                    setError('');
                    setMessage('');
                    requestId.current = null;
                  })
                  .catch((e) => setError(e.message))
              }
            >
              Refresh workspace
            </button>
          </div>
        </>
      )}
    </section>
  );
}
