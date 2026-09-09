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

Unit tests cover schema rejection, origin/secret checks and persisted local jobs. Route tests cover upload authentication, retries, acceptance ownership and mission Git references. Full model generation and Blender rendering require installed dependencies and are not yet verified on this machine. Browser-to-loopback permission behavior has not been browser-tested. The UI reports connection errors and suggests using a regular browser when an embedded browser blocks local-network access.

Shared uploads are contributor-supplied results, not cryptographically attested executions. Human review remains necessary. The first adapter supports primitive blockouts, not arbitrary game assets, rigging, animation or engineering validation.
