# Local workshop v1

The first agent-assisted vertical slice is a local Blender blockout workflow for the Mahabharata mission. The site coordinates user direction and review. A Python loopback companion delegates one structured planning request to a downloaded Ollama model and applies the validated plan using a fixed Blender adapter. Model-generated Python is never executed.

## Contracts implemented

- Pairing: random per-process secret, exact site Origin and loopback Host, CORS preflight including local-network permission support. Secret held only in UI memory. No remote tunnel or public listener.
- Discovery: Blender presence, installed model list, local jobs. Before a run, inspect the selected model and reject remote/cloud descriptors.
- Jobs: UUID retry identity, one active run, parent scene for iterative direction, persisted local state, four-minute model timeout, eight-minute adapter limit, cooperative inference cancellation and process termination during rendering.
- Results: `.blend`, PNG, validated scene JSON, and run metadata in a ZIP. The local result is immutable once complete. User chooses when to upload.
- Shared results: authenticated uploads, bounded bodies, per-person reservation quota, immutable object bytes, ownership-protected acceptance, artifact content hash and reference committed to mission Git.

## Scaling boundary

This release is one local worker per browser connection, not a shared worker pool. Job execution does not consume website-worker memory beyond transferring bounded artifacts. Other tools can implement the discovery/job/result contract; the Blender adapter is deliberately separate from the server. Unreal, remote scheduling, leases, retries across worker failure, hardware capability routing, artifact deduplication, and pooled compute budgets are future integrations. Do not represent them as connected.

Before multi-worker scheduling, move job ownership into a durable queue with expiring leases, cancellation tokens, idempotent result publication, capability/version declarations, and measured resource allowances. Keep artifact storage separate from queue state. Avoid distributing model or machine credentials to mission participants.

## Verification and limits

Unit tests cover schema rejection, origin/secret checks, persisted local jobs, duplicate requests and scoped cancellation. Route tests cover upload authentication, preview ownership/bytes, immutable reviews, retries, acceptance ownership and mission Git references. Full local Qwen3 8B generation and Blender 5.2 rendering have been exercised on this machine. Geometry quality still requires human review. Browser-to-loopback permission behavior has not been browser-tested. The UI reports connection errors and suggests using a regular browser when an embedded browser blocks local-network access.

Shared uploads are contributor-supplied results, not cryptographically attested executions. Human review remains necessary. The first adapter supports primitive blockouts, not arbitrary game assets, rigging, animation or engineering validation.

## Generic mission-tool iteration

The platform distinguishes mission requirements, local tool adapters, and local agent models. `/missions/[slug]/workshop` scopes UI jobs and shared artifacts to the selected mission. Tool requirement changes are owner-only, revision-checked, recorded in Git, and inherited by forks. `mission-tools.json` is managed through the requirements interface, not working-file edits or incoming merges.

The companion's `connectors.py` owns configurable adapters. Its first generic operation reads a fixed JSON URL. The optional bearer token lives in `.local-connectors.json`, excluded from Git and the download bundle; it is not protected by an OS credential vault yet. Discovery never returns the token or endpoint. API errors do not expose response bodies. Returned data may be sensitive: sharing is always explicit.

Blender remains a specific tool adapter. Unreal is a Mahabharata requirement with no connected executor. The architecture permits other adapters; it does not claim universal application control. Companion version 3 is required by the new UI. Existing jobs without mission/tool fields are treated as legacy Mahabharata/Blender runs.
