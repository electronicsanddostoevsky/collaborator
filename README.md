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

## Artifact preservation increment
One optional uploaded file per contribution, up to 10 MiB, stored under a unique R2 object key with a SHA-256 fingerprint. Submitted artifact bytes have no overwrite endpoint. Supported extensions: txt, md, json, png, jpg, jpeg, pdf, zip, glb, stl, step, stp. Downloads require sign-in and use attachment/octet-stream responses; contents are neither scanned nor executed. Unsubmitted uploads are owner-only; linked submissions are downloadable by authenticated participants within this private Site's access boundary.

A contributor has a 100 MiB pilot allowance across retained uploads. Failed storage writes are cleaned up; abandoned successful uploads currently retain their quota allocation. Automatic expiry and upload management are future work. Do not expose this private pilot broadly before moderation, cleanup, and final contribution terms are ready.

Contributions may name an accepted or changes-requested contribution on the same task as their parent. Every submission remains a separate record. This is artifact provenance, not Git branch merging. A two-person signed-in pilot and browser interaction QA remain to be performed.

## Mission-first expansion
The root is a searchable, category-filtered mission feed. The original game workflow remains at /mahabharata. /missions/beach-cleanup and /missions/haircut-machine are explicitly seeded example missions with no real event date, organizer, or fabricated participants. Signed-in people can express one role of interest per mission, update it, and withdraw. Only aggregate counts are shown; private planning notes are returned only to their author. Payments, confirmed scheduling, public mission creation, and organization formation are not implemented.

The shareable vision is output/pdf/Collaborator-Help-Make-It-Exist.pdf and is also available from the feed as /vision.pdf. It documents the user's expanded purpose and examples, including commercial implementations under explicit terms without silent appropriation of community work.

## User-created missions
Signed-in users can create missions at /missions/new. Missions persist, appear newest-first in the feed, and support the existing role-interest workflow. Six categories include creative, local, invention, community/movements, commercial enterprise, and research. Community/noncommercial intent is the default; the chosen intent is immutable. Labels describe intent, not a legal license or finalized commercial terms.

Only the creator can edit mission details. Optimistic revision checks reject conflicting edits; existing role names cannot be removed or renamed, preserving participation meaning. The pilot allows 20 missions per account and lists the newest 200. Full historical mission-text snapshots, custom mission uploads, task graphs, moderation, agent execution, and public access are not part of this increment. Revision numbers track edits, not archived copies of each mission text.

## Mission updates and My missions
Creators (or the configured maintainer for seeded missions) publish progress, open questions, and next steps. Participants can reply to an update after expressing interest; Mahabharata followers, task claimants and contributors can reply too. Posts persist in D1, are immutable in this pilot, and have a 30-post daily cap per account. Recent activity is loaded explicitly; there are no push notifications or unread counters. My missions lists the current account's created/joined missions, followed Mahabharata mission, latest updates, and maintainer review count. The list is capped at 200 community missions plus seeded missions. A real two-person browser pilot remains to be conducted.
