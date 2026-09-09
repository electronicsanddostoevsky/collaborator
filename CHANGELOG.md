# Collaborator platform history

This repository versions the Collaborator platform itself. Mission activity and uploaded contributions are separate application data. Future mission repositories must remain separate from this repository and from one another.

## 2026-09-09 — Actions and mission history

- Add concrete actions to community and seeded action missions, with an effort estimate, contribution type, and definition of done.
- Claim, release, submit, accept, and request changes using optimistic revisions. Keep an append-only record of each successful transition in the same transaction.
- Preserve mission brief snapshots when missions are created or edited. Capture the current version before editing a legacy mission; do not invent missing earlier history.
- Add a unified recent-history view and JSON export for brief versions, action changes, conversations, and the Mahabharata contribution review trail.
- Include active actions and pending action reviews in My missions.
- Document the intended separation between the platform repository, per-mission Git workspaces, activity records, and binary assets.

## 2026-09-09 — Real per-mission Git histories and forks

- Store genuine commit ancestry for mission definitions, with Git objects in R2 and independent mission refs in D1.
- Export standard Git bundles that can be cloned and inspected with Git; validate with native Git, including strict fsck and merge-base ancestry.
- Fork a mission from a specific head, preserve upstream ancestry and commercial intent, and edit the fork independently.
- Let creators select platform fork policy at creation. Preserve the policy in descendants; reject stale-source forks and duplicate requests safely.
- Initialize pre-existing missions from their current baseline, with no invented historical commits. Digital files, remote Git push/pull, and merges are still future work.

## 2026-09-09 — Updates and My missions

- Creators publish progress, questions, and next steps; participants reply.
- Persist posts with retry protection and a per-person daily cap.
- Show created, joined, and followed missions, latest updates, and maintainer review reminders.

## Earlier MVP increments

- Mission discovery and the shared vision document.
- Mahabharata task claiming, contributions, maintainer review, and accepted revisions.
- Immutable uploaded artifacts and contribution lineage.
- Participation for real-world and physical-design missions.
- Creation and ownership-aware editing of community missions.

The Git commit history is the authoritative source history. These release notes describe user-visible behavior and do not replace the code diffs.

## 2026-09-09 — Follow without committing

- Follow or unfollow any mission without claiming an action or expressing role interest.
- Followers can join mission conversations; role commitments remain independent.
- My missions includes followed missions and adds Created, Following, and Participating filters plus explicit refresh.
- Preserve the existing Mahabharata follow state and account isolation.
