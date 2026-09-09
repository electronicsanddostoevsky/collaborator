# Collaborator

## Current increment: 0 — Mission explorer
A private, responsive mission interface. One seeded Mahabharata mission, shared vision, contribution briefs, concept art, and a downloadable mission brief. Following is session-only UI state. No fake community statistics, playable game, accounts, shared writes, or agent execution.

## Agreed product contract
- Anyone can explore or propose; implementation maintainers accept shared changes.
- Missions can have independent implementations. Forks preserve provenance and applicable terms.
- Personal experiments use personal resources. Shared execution requires a bounded allocation.
- A human initiates an agent run. Agents submit proposals, never approve their own work or increase budgets.
- Outputs are intended to be shared and protected from private commercialization. Legal terms and rights governance must be finalized before public submissions.
- Physical products use versioned design artifacts plus separate physical build and validation records.

## Next increments
1. Durable human collaboration: identity, tasks, claims, artifact revisions, proposals, maintainer review, accepted revision history. Test with two accounts and one accepted contribution.
2. One bounded agent workflow: isolated working copy, exact input revisions, limited tools, cost ceiling, cancellation, logs, proposal output. No shared secrets or automatic merge.
3. Branches/forks and a simple physical design trial: provenance, design revision, bill of materials, manual build record and measurements.

## Architecture direction
Keep one backend with a relational database, object storage, a queue, and isolated workers. Do not treat a live shared folder as a multi-agent coordination mechanism. Git handles code/text; manifests reference immutable binary assets. Agents receive focused task context, not every project conversation.

## Validation
Production build and TypeScript validation are required for this increment. Browser interaction/visual QA has not been requested. WebMCP is progressively enhanced; registry verification requires a supporting browser and is recorded as unverified until available.

## Open decisions before spending or public launch
Monthly execution ceiling; contributor licensing/withdrawal/relicensing rules; initial collaborators. No credentials belong in committed files.

## Increment 1 implementation
Persistent D1 claims, follows, immutable written submissions with optional HTTPS artifact links, maintainer review decisions, and numbered accepted contributions. Identity comes only from Sites dispatch-authenticated headers. API mutation routes reject missing identity and cross-origin requests. External linked files are not snapshotted or version-controlled by this increment.

Maintainer rights are fail-closed until MAINTAINER_EMAIL is explicitly confirmed by the owner and set in hosted runtime configuration. No sample or first-visitor account receives authority. The site remains owner-private; inviting collaborators is a separate access change.

Tests: `node tests/collaboration.test.mjs` uses a real in-memory SQLite database and the actual route code with only the database/runtime configuration adapter replaced. Covers claim races/ownership, duplicate submissions, input checks, denied review, and persistent follow state. `python tests/local_api.py` checks that local Sites rejects spoofed identity headers. Positive maintainer review requires a confirmed account before end-to-end verification.
