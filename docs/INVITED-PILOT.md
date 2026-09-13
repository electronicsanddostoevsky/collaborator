# Invited Collaborator pilot

Updated 13 September 2026. The hosted pilot is restricted to the owner and explicitly invited testers. The feed is shared within that group, not public on the internet. Public GitHub source is a separate audience from private mission data.

## A complete first test

1. The owner adds each tester's ChatGPT sign-in email to the existing Site's viewer access. A plain copied URL does not grant access. Viewer access to the Site is sufficient to use the application; platform source editing is unnecessary.
2. A tester signs in, creates a small mission, and sees it in the feed. They automatically become its community member and retain mission lead authority. Other testers join from Community and leads.
3. A participant connects their own companion and local model or ChatGPT-connected Codex. They propose a small modular plan; the creator edits and approves it. For a first test, use a written-contribution task with tool ID `mission-writer`.
4. Another participant claims that task, opens its workshop, selects an agent, and starts work. Starting records responsibility before invoking the local companion. Each subscription run requires consent to send brief/context. The contributor reads the output and shares it.
5. The creator reads the written contribution in the workshop, gives feedback and accepts it. The linked task completes and the actual Markdown enters mission Git. A following task receives the accepted file in its recorded snapshot and bounded reference excerpts.
6. Refresh both browsers, download mission history, and repeat after restarting the companion. Confirm no work silently restarts. Shared progress is reported while the workshop remains open; it is not proof of execution or approval.

Use a reading circle, cleanup preparation, a short creative work or a design specification to verify this is a mission platform rather than only a game tool. No test should require that a generated proposal already be factually correct: the human review step is part of the product.

## What contributors provide

The platform shares tasks and results. A contributor retains their account, local files, pairing code and Codex sign-in credentials. They supervise their own computer. This does not transfer ChatGPT accounts or pool account tokens. Native Windows is the tested companion environment; additional PCs and browsers still need the invited trial. Reviewers and organizers need no paid AI plan.

The bundled setup helper installs Python and optionally Ollama or Blender after local confirmation. The public package includes only the explicit files in scripts/package_workshop.py. Never distribute a working companion folder containing `.codex-agent`, `.local-connectors.json` or `runs`.

## Reliability and limits

- Mission data, plans, approvals, memberships, run records and Git references are stored on the host. Local generation files survive browser closure on the contributor's computer.
- One active tracked workshop run per account; 30 starts per UTC day. These are not token-cost limits. Planning proposals and direct companion requests use their existing separate controls.
- A progress record older than 90 seconds is shown as needing attention. No automatic reassignment or retry occurs. Reconnect the original computer, or check/stop its run and explicitly close tracking. Another mission's unresolved run is linked from the workshop.
- Upload retries keep artifact identity; task assignment, task revision, tool requirements and Git ancestry are checked server-side. Only the creator or an authorized subdivision lead can accept work. Acceptance of a linked artifact and completion of its task occur together.
- Written results are validated JSON, at most 32 KB; accepted text is stored as a unique Markdown file so another contribution is never overwritten. Binary results remain in object storage with content hashes.
- Existing bounds remain: 20 missions per creator, 100 tasks per mission, 200 community members, 100 retained companion runs, 10 MB binary transfers, 100 MB workshop storage per user, 12 working text files and 64 KB of total mission text. Full local originals remain available if sharing fails.
- Agents currently generate bounded plans, written drafts and simple Blender scenes. Configured API connections are fixed read-only operations. Browsing, arbitrary code execution, general-purpose computer control, Unreal integration and unattended remote workers are not implemented.

## Hosting and recovery

The current host is the existing private Sites deployment. Its access policy handles sign-in and the trusted identity headers used by application routes. Manage tester access through that policy; do not make the whole site public to work around an invitation problem.

Code and the manifesto are versioned separately at https://github.com/electronicsanddostoevsky/collaborator. The owner's local Git bundle preserves platform source history. Mission Git exports preserve their text history, while database records and binary object storage require separate host backups. A platform Git bundle is not a complete backup of live community data.

Independent hosting needs a compatible Worker runtime, database, object storage, and an authenticated gateway that strips untrusted identity headers and injects verified user identity. Do not expose the current raw worker behind a generic public web server and trust user-supplied `oai-authenticated-user-*` headers. Portable authentication and a rehearsed full data restore remain requirements before claiming a turnkey self-hosted distribution.

## Verification and remaining pilot gate

Automated tests cover different simulated users with real SQLite and Git objects: creation, joining, claims, lead scopes, revocation, review, immutable retries, multi-page feed traversal, concurrent starts and recovery. Python tests cover the writer, input bounds, cancellation, local pairing, restart and Codex protocol behavior. Real written-draft generations completed on the owner's PC using both Plus-backed Codex (27 seconds) and local Qwen3:8b (10 seconds). These timings describe two runs, not a performance guarantee.

These checks do not establish two-PC/browser compatibility or real group usability. Complete the first test above with an invited person before calling the pilot validated. Signed installation, larger asset workflows, storage cleanup, notifications, moderation and broader deployment remain in the future change log.
