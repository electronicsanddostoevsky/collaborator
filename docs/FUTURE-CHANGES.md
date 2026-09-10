# Collaborator — future change log

Updated 10 September 2026. This is a prioritized backlog, not a claim that the listed integrations exist. Each item gets a separate platform commit and release entry when implemented. Mission outputs continue to use their own histories.

## Completed in the current workshop increment

- Local Blender/Ollama execution, revision ancestry, downloadable editable results and local run history.
- Explicit Blender material nodes and clearer coordinate instructions.
- Selected preview, phase labels, compact iteration navigation, reconnect and retry controls.
- Shared PNG previews, maintainer acceptance or requested changes, immutable review notes and accepted artifact references in Git.
- Scoped cancellation and duplicate-request protection. Tests exercise these boundaries.

## Prioritized next changes

Task-linked contributions are implemented: claimed tasks open a scoped workshop, retain declared input revisions, and submit artifacts for scoped lead review. Acceptance updates the task and mission Git together; requested changes reopen work. Automatic workspace input retrieval, shared worker leases, and the real multi-contributor trial remain pending.

| ID | Priority / state | Change | Definition of done | Dependency / challenge |
| --- | --- | --- | --- | --- |
| W-01 | Partial / local control window implemented | Easier connection and reliable restart | Signed installer, launch shortcut, explicit local consent, supported-browser connection tests, reconnect after PC restart | Local-network browser permissions and installer signing; current manual pairing remains |
| W-02 | Next / planned | Better first-draft quality | A small evaluation set measures geometry, connected parts, orientation and instruction fidelity; compare models; show limitations before runs | A successful render does not establish a usable asset; current Qwen blockouts need supervision |
| W-03 | Partial / remote originals pending | Review-guided agent revisions | Feed mission review notes into a new job with parent artifact identity; show before/after and preserve all originals | Current revision is initiated from the local original; remote contributors need artifact retrieval |
| W-04 | Implemented | Workshop for every mission | Mission-scoped jobs, briefs and permissions across creative, physical-design and action missions | Mission routes and local jobs are scoped; requirements and fork inheritance are tested |
| W-05 | Following / planned | Unreal scene connector | Import a reviewed asset into an isolated Unreal project, validate it, produce a playable preview and submit for review | Engine installation/version, GPU and disk needs, asset scale, licensing and packaging |
| W-06 | Partial / GLB export implemented | Richer Blender assets | Mesh editing, materials/textures, glTF export and asset validation with reproducible tool versions | Expand trusted operations without giving generated code unrestricted machine access |
| W-07 | Following / planned | Durable worker queue | Lease-based claims, capability routing, cancellation acknowledgements, recovery and idempotent result publication across workers | Current companion supports one local job at a time; no shared compute pool |
| W-08 | Following / planned | Storage lifecycle | Visible storage usage, archive/export, abandoned-upload cleanup and large resumable uploads | Binary assets grow rapidly; current 10 MB bundle and 100 MB workshop allowance are pilot limits |
| W-09 | Later / planned | Contributed compute and spending | Opt-in hardware schedules, measured resource use, fair allocation, hard paid-run ceilings and sponsor accounting | Electricity, bandwidth, GPU availability, untrusted outputs and retry costs; no invented cost guarantees |
| W-10 | Later / planned | Physical prototyping | CAD adapter, BOM revisions, safety review, fabrication quote and explicit build approval | Geometry generation alone does not establish engineering safety or manufacturability |
| W-11 | Later / planned | Community governance | Mission roles, contribution terms, attribution, moderation, clear fork policies and review disputes | Community/noncommercial intent must remain explicit; software cannot substitute for final legal terms |

## Release discipline

1. Pick a complete user outcome and its acceptance checks.
2. Implement and test persistence, permissions, failure/retry behavior, and the actual connected tool.
3. Refine the UI against that working outcome; do not display disconnected tools as available.
4. Record the source commit, deployment and verification evidence in the platform changelog.
5. Move the item from planned to completed only when its definition of done is met.

## Known limits after this release

The end-to-end local model and Blender path has been exercised on this PC. Browser-to-loopback interaction has not been browser-tested. The current model can produce structurally valid but poorly proportioned objects; human visual review remains essential. Remote Git push/pull, Unreal execution, distributed agents, pooled budgets, and manufacturing are not implemented.

## Mission-specific tools and generic connections — 10 September 2026

Implemented: every mission has its own workshop and versioned tool requirements. Mahabharata defaults to Blender and Unreal Engine; other missions have no game-development defaults. Tool requirements survive forks and may evolve independently. The local companion declares capabilities separately from installed agent models.

A configurable HTTP connector can read a fixed JSON API endpoint, without an agent. The paired PC owner configures the exact URL and optional bearer token locally. The operation is GET only, redirects are refused, the response is capped at 1 MB, and execution has a 30-second timeout. Returned data stays local until explicitly shared. No arbitrary API writes, model-selected URLs, or unrestricted computer control are implemented.

Roadmap updates:
- W-04: implemented mission-scoped workshops, tool requirements and local job filtering. Cross-mission revision parents are rejected.
- W-03: partially implemented — recorded review feedback can seed a new revision when its original exists on the connected PC. Retrieving a remote contributor's original is still pending.
- W-06: partially implemented — Blender now exports GLB alongside `.blend`. Rich mesh operations, textures and quality evaluation remain pending.
- W-01, W-02, W-05 and W-07 through W-11 remain planned. This release does not provide a signed installer, arbitrary tool automation, Unreal execution, a worker pool, paid budgets or manufacturing.

Next technical priority: expand the connector contract to declared operations with parameter schemas, credential references, consent requirements and capability versions. Introduce remote scheduling only after authentication, leases, resource budgets and per-operation permissions are designed and tested. The current Python adapter core can run outside Windows with appropriate installed tools; non-Windows execution has not been tested here.

## Easier local start and stop — 10 September 2026

Implemented a consent-first control window with Start, Copy pairing code, and Stop. Restart preserves work and rotates credentials; stop blocks new jobs and drains cancellation before closing. Windows uses an exclusive local socket to prevent competing launches. Automated tests cover consent, duplicate launch, stale-code rejection, preserved history, and stop/restart.

Still pending for W-01: a signed installer, OS shortcut registration, browser-to-loopback permission testing, and cross-platform packaging. No automatic startup is enabled.

## Agreed modular plans and public source — 10 September 2026

The source and revised manifesto are now public under electronicsanddostoevsky/collaborator on GitHub, with earlier development history preserved. The running pilot remains private. Licensing terms remain a separate decision; see INDEPENDENCE.md.

Every mission can request a bounded plan from a local model, edit its draft, and submit it. The mission lead can edit a shared proposal and approve or reject it with a note. Approval atomically creates up to 12 shared tasks, links their dependencies, and records the accepted plan in mission Git. Prerequisite tasks must be accepted before dependent tasks can be claimed. Proposals do not execute project work.

A real Qwen3 8B planning trial produced a structurally valid three-task Mahabharata plan. This verifies generation and validation, not production quality or Unreal availability. Permission, stale-decision, retry, and dependency tests passed. The pilot caps plans at 40 per mission and all actions at 100; it is not yet a large-team scheduler.

Next: scoped subdivision leads, task-to-tool handoff, durable shared workers, and a real Unreal adapter. The full collaboration trial is defined in PILOT-ACCEPTANCE.md. Forks retain the accepted plan as historical source, but do not automatically copy task assignments or approvals into the new community.

## Community and scoped subdivision leadership — 10 September 2026

Members can explicitly join a mission and see it in My missions. The owner remains the default lead and can appoint or revoke subdivision leads from active members. Assignments enter mission Git, without putting account identifiers into the team snapshot. A fork inherits historical team documentation, not live authority or memberships.

A delegated lead may edit or decide a plan only when every task is in a subdivision they lead. The same scope controls task-result acceptance and requests for changes. Permission is checked again in the write transaction so revocation cannot be bypassed by a decision already in flight. Members holding a lead role must have it revoked before leaving. Leaving the member list does not release existing work or remove separate follows.

Tests cover cross-scope denial, forbidden scope changes, owner-only delegation, inactive members, revocation races, Git snapshots and My missions. This pilot allows 200 active members and 40 subdivisions per mission. Site access invitations remain separate from in-app membership. Workshop artifact reviews are still owner-only until artifacts are connected to scoped tasks.
