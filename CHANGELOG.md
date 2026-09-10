# Collaborator platform history

## 2026-09-09 — Local Blender workshop

- Add a guided describe, generate, preview, revise, share, and accept workflow to the Mahabharata mission.
- Connect a local Python companion with a temporary pairing code; discover Blender and installed Ollama models.
- Translate validated scene data into Blender blockouts, with local run history, cancellation and bounded execution.
- Retain shared editable result bundles separately from Git; commit content-hashed references on maintainer acceptance.
- Include a Windows prerequisite installation helper. Full generation requires Blender and a downloaded local model; those dependencies are not bundled.

## 2026-09-09 — Reviewed contributions between forks

- Propose fixed working-file versions from a fork to its direct upstream mission.
- Compare files against shared ancestry; require explicit choices for conflicting files and a review note.
- Merge with two Git parents, preserve upstream identity and intent, and retain review decisions.
- Reject stale upstream versions and unauthorized reviews; preserve retry safety.
- Verify exported merge histories with native Git clone, strict fsck, and ancestry checks.

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

## 2026-09-09 — Versioned working files

- Add a small text workspace to every mission: notes, code, JSON, and text-based design such as OpenSCAD.
- Creator/maintainer file edits produce real Git commits. Forks inherit working files; later brief edits retain them.
- Add stale-head protection, repeat-safe writes, safe portable filenames, size limits, and reversible file removal.
- Preserve compatibility with the earlier single-file Git objects and verify multi-file clones and historical file recovery with native Git.
- Keep files inert in the web interface. Binary workspaces, execution, remote synchronization, and reviewed merging remain future integrations.

## 2026-09-10 — Workshop review and UI completion
- Fix Blender material colors and clarify scene coordinate instructions.
- Scope cancellation to the active run and make retries return the existing run.
- Add immutable shared PNG previews, review notes, and changes-requested outcomes.
- Refine the workshop around the creative brief, selected preview, and compact iteration history.
- Add a public future-change log with priorities, acceptance criteria, and current limitations.
- Verify the local model-to-Blender path; distinguish execution success from asset quality.
