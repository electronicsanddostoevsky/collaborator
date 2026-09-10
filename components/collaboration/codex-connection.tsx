'use client';
import { useState } from 'react';
type State = {
  installed: boolean;
  connected: boolean;
  signedIn: boolean;
  plan?: string;
  loginPending?: boolean;
  models: { id: string; name: string }[];
  limits?: {
    primary?: { usedPercent: number; resetsAt?: number };
    secondary?: { usedPercent: number; resetsAt?: number };
  };
};
export const agentLabel = (model: string) =>
  model.startsWith('codex:')
    ? 'Codex · ' + model.slice(6) + ' · subscription'
    : model + ' · on this computer';
export default function CodexConnection({
  request,
  changed,
}: {
  request: (path: string, payload?: unknown) => Promise<unknown>;
  changed: () => Promise<void>;
}) {
  const [state, setState] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [url, setUrl] = useState('');
  async function act(operation: string) {
    setBusy(true);
    setError('');
    try {
      if (operation === 'login') {
        const d = (await request('/codex/login', {})) as { authUrl: string };
        const u = new URL(d.authUrl);
        if (
          u.protocol !== 'https:' ||
          !['auth.openai.com', 'auth0.openai.com', 'chatgpt.com'].includes(
            u.hostname,
          )
        )
          throw Error('Unsupported sign-in address.');
        setUrl(d.authUrl);
      } else {
        if (operation === 'disconnect') await request('/codex/disconnect', {});
        const d = (await request(
          operation === 'connect' ? '/codex/connect' : '/codex/status',
          operation === 'connect' ? {} : undefined,
        )) as State;
        setState(d);
        if (d.signedIn || !d.connected) setUrl('');
        await changed();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect Codex.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="ws-connection">
      <summary>Use Codex with your ChatGPT subscription</summary>
      <p>
        Codex supplies the AI; approved tools run on this computer. Connect,
        sign in, then choose a Codex model in the agent selector. Each run uses
        your account allowance.
      </p>
      <p>
        This connection stores sign-in only in the local workshop profile.
        Project briefs and reference excerpts are sent to OpenAI when you
        approve a Codex run.
      </p>
      <div className="action-buttons">
        <button
          type="button"
          className="secondary"
          disabled={busy || !!state?.connected}
          onClick={() => act('connect')}
        >
          Connect Codex
        </button>
        {state?.connected && !state.signedIn && (
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => act('login')}
          >
            Prepare ChatGPT sign-in
          </button>
        )}
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => act('status')}
        >
          Refresh connection
        </button>
        {state?.connected && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => act('disconnect')}
          >
            Disconnect agent
          </button>
        )}
      </div>
      {url && (
        <p>
          <a
            className="text-button"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open official ChatGPT sign-in ↗
          </a>
          <br />
          After signing in, use Refresh connection. If the link expired,
          disconnect and connect again.
        </p>
      )}
      {state && (
        <p role="status">
          {state.signedIn
            ? 'Connected to your ' +
              (state.plan || 'ChatGPT') +
              ' account · ' +
              state.models.length +
              ' available models'
            : state.connected
              ? 'Sign in with ChatGPT to enable subscription runs.'
              : state.installed
                ? 'Codex is installed. Connect when ready.'
                : 'Install the Codex app or CLI, then restart the workshop.'}
        </p>
      )}
      {state?.limits && (
        <p>
          Account allowance remaining:{' '}
          {state.limits.primary
            ? Math.max(0, 100 - state.limits.primary.usedPercent) +
              '% in the primary window'
            : 'unavailable'}
          {state.limits.secondary
            ? ' · ' +
              Math.max(0, 100 - state.limits.secondary.usedPercent) +
              '% in the secondary window'
            : ''}
          . Shared with your other Codex work; refreshed on request.
        </p>
      )}
      <p className="workspace-status">
        No automatic API billing or credit purchases. Disconnect stops this
        adapter; sign-in is retained on this PC. This pilot supports plan and
        scene generation, not unrestricted agent control.
      </p>
      {error && (
        <p role="alert">
          {error} Use the latest workshop download if this operation is
          unavailable.
        </p>
      )}
    </details>
  );
}
