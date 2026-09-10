# Collaborator — future change log

Updated 10 September 2026. This is a prioritized backlog, not a claim that the listed integrations exist. Each item gets a separate platform commit and release entry when implemented. Mission outputs continue to use their own histories.

## Completed in the current workshop increment

- Local Blender/Ollama execution, revision ancestry, downloadable editable results and local run history.
- Explicit Blender material nodes and clearer coordinate instructions.
- Selected preview, phase labels, compact iteration navigation, reconnect and retry controls.
- Shared PNG previews, maintainer acceptance or requested changes, immutable review notes and accepted artifact references in Git.
- Scoped cancellation and duplicate-request protection. Tests exercise these boundaries.

## Prioritized next changes

| ID | Priority / state | Change | Definition of done | Dependency / challenge |
| --- | --- | --- | --- | --- |
| W-01 | Next / planned | Easier connection and reliable restart | Signed installer, launch shortcut, explicit local consent, supported-browser connection tests, reconnect after PC restart | Local-network browser permissions and installer signing; current manual pairing remains |
| W-02 | Next / planned | Better first-draft quality | A small evaluation set measures geometry, connected parts, orientation and instruction fidelity; compare models; show limitations before runs | A successful render does not establish a usable asset; current Qwen blockouts need supervision |
| W-03 | Next / planned | Review-guided agent revisions | Feed mission review notes into a new job with parent artifact identity; show before/after and preserve all originals | Current revision is initiated from the local original; remote contributors need artifact retrieval |
| W-04 | Next / planned | Workshop for every mission | Mission-scoped jobs, briefs and permissions across creative, physical-design and action missions | Current guided page targets Mahabharata; prevent cross-mission context and result mix-ups |
| W-05 | Following / planned | Unreal scene connector | Import a reviewed asset into an isolated Unreal project, validate it, produce a playable preview and submit for review | Engine installation/version, GPU and disk needs, asset scale, licensing and packaging |
| W-06 | Following / planned | Richer Blender assets | Mesh editing, materials/textures, glTF export and asset validation with reproducible tool versions | Expand trusted operations without giving generated code unrestricted machine access |
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
