# Collaborator platform history

## 2026-09-13 — Invited community pilot

- Replace the gallery with a chronological mission feed, server-side search and category filters, stable cursor pagination and automatic scrolling with a manual fallback. All created missions appear to invited testers; examples remain labeled.
- Add a Getting started guide for mission creation, joining, own-account agents, review and recovery. New mission creators join their community automatically.
- Add written contributions for any mission using Ollama or ChatGPT-connected Codex. Review shared text inline; acceptance records the actual Markdown in mission Git for later task context.
- Fix the companion version check that incorrectly disabled workshop execution after an update. Add writer-aware revision parents and mission/task tool selection.
- Record contributor starts and progress durably. Prevent overlapping tracked starts per account, cap starts at 30 per UTC day, expose stale connections and explicit recovery. These are supervised local contributions, not pooled credentials or an unattended worker queue.
- Distribute the updated companion without private profiles, configuration or generated runs. Add SQLite multi-person workflow and Python writer tests.

## 2026-09-10 — User-connected Codex

- Connect an installed Codex app server through the local companion; use a separate ChatGPT sign-in profile and discover subscription models and allowance summaries.
- Support Codex alongside Ollama in mission planning and Blender workshops. Require explicit cloud-context consent per run, retain the provider/model label, and refuse automatic API-key fallback.
- Keep generation bounded to JSON, disable execution/app/plugin/delegation tools, reject server approval requests, and retain the existing trusted local renderer and human mission review.
- Test native Windows Codex 0.153.4 with a real Plus-backed Astra work plan (23 seconds) and editable Blender/GLB result (16 seconds). Validate the plan with the application contract and inspect the rendered blockout. This is not general autonomous tool control or a pooled worker service.
- Add MVP/scale acceptance work, a staged launch plan and an assumption-based INR budget in docs/MVP-AND-LAUNCH.md.

## 2026-09-10 — Saved project context for local work

- Fetch the exact mission text snapshot when starting a claimed task, save it locally as data, and include it in result bundles. Workspace filenames are never extracted or executed.
- Feed bounded reference excerpts to the Blender agent and preserve the exact excerpt alongside the complete snapshot. Fixed API connections retain the snapshot as provenance without changing their request.
- Include approved input/output descriptions and latest review feedback in the editable task brief; show full details in the workshop.
- A real Qwen3:8b and Blender run completed in nine seconds with inputs and editable files preserved. Visual inspection found orientation problems: this validates context transport, not output quality.
- Binary input retrieval, reusable scene import, worker leases, and cross-machine execution remain pending. Snapshot identifiers and hashes are provenance declarations, not remote execution attestation.

## 2026-09-10 — Task-linked local contributions

- Open claimed work in a task-specific workshop with its brief, acceptance criteria, declared mission revision, and approved tools.
- Preserve task inputs through local runs and immutable upload retries. Reject stale claims, foreign mission revisions, and tools outside the approved task requirements.
- Sharing sends the task for review. Scoped lead acceptance atomically completes it and adds the artifact reference to mission Git; requested changes reopen it.
- Verify permission boundaries, task transitions, duplicate submissions, revision requests, and Git references with real SQLite integration tests; test local request context validation over HTTP.
- Recorded input revisions are declarations, not proof that a tool loaded every workspace file. Shared workers and automatic input retrieval remain future work.

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

## 2026-09-10 — Mission-specific tools and generic API adapter
- Separate mission tool requirements from local agent models and available operations.
- Keep Blender and Unreal as Mahabharata requirements; provide workshops for every mission.
- Preserve tool requirements in Git and forks; enforce owner-only edits and optimistic revisions.
- Add locally configured read-only JSON API connections, with fixed URLs, bounded responses and redirect rejection.
- Scope local jobs and revision parents to their mission; reuse review feedback for local revisions.
- Export GLB from new Blender runs. Unreal execution remains pending.

## Local workshop control window — 10 September 2026
- Explicit local consent, start/copy/stop controls, safe shutdown, fresh codes after restart, and retained results.
- Windows exclusive listener prevents duplicate workshop instances; lifecycle and existing adapter tests pass.
- Updated setup help; signed installation and browser compatibility testing remain pending.

## Approved modular planning — 10 September 2026
- Public GitHub source and revised manifesto with independent Git backup.
- Local AI planning, editable proposals, lead approval/rejection, dependency-aware tasks and accepted Git snapshots.
- Tested real local generation, permissions, retries and stale writes. Subdivision leads, worker sharing and Unreal execution remain pending.

## Community and subdivision leads — 10 September 2026
- Explicit membership, visible teams and owner-managed subdivision leads.
- Scoped plan decisions and task reviews, transactional revocation checks, and Git-recorded role changes.
- Membership and delegated review counts integrated into My missions; real collaborator invitations remain pending.
