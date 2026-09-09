# Git, mission history, and the platform itself

## Three distinct histories

1. **Platform source history:** this standalone Git repository contains Collaborator code, migrations, tests, product documentation, and CHANGELOG.md. Its commits are pushed to the site's source repository before each private publication. It must not accumulate private mission records, member notes, user uploads, or agent credentials.
2. **Mission activity history:** D1 stores append-only action events and mission brief snapshots alongside conversations and contribution reviews. This history explains decisions and real-world progress even for missions without a digital workspace. Optimistic revision checks protect concurrent changes; action state and its event are committed together. This is a readable revision log, not a Git repository, a cryptographic ledger, or a claim of tamper-proof storage.
3. **Mission Git history (implemented for definitions):** each mission has its own `main` reference and genuine Git commit ancestry. Canonical Git object data lives in immutable R2 objects; D1 stores heads, ancestry metadata, and fork policy. A downloadable Git v2 bundle contains a complete repository with `mission.json`. Forks get independent heads with the source head as their parent. The object store may share identical ancestry without combining missions into one branch namespace. Full code/design workspaces are the next layer; one mission may eventually need several workspaces (game code, lore, CAD, firmware).

## What is implemented

Mission creators can add actions with a clear definition of done. Contributors take responsibility and submit a written result with an optional link. Creators accept it or request changes. Each successful transition preserves the actor, time, operation, result/review text, and revision. A released action keeps its previous history.

Created missions save a full brief snapshot; edits preserve both the previous baseline and the new snapshot. Earlier MVP edits were not stored as full snapshots and cannot be recovered. Seeded mission briefs are currently versioned in this platform repository. The history page displays up to 200 records per category; its JSON export has the same explicitly bounded scope. It excludes private participation notes, account IDs, and draft uploads.

## Planned Git workspace contract

The first repository layer is live: creation and brief edits generate actual commit/tree/blob objects, refs advance with optimistic checks, and forks preserve upstream mission and base commit. Existing missions initialize a truthful current baseline on first repository access; missing earlier versions are not reconstructed. Objects are written before the D1 transaction advances the reference, so an interrupted or conflicting operation may leave an unreachable object, but never a published ref to an unwritten object. Orphan cleanup is future maintenance work.

Creator-selected platform fork policy is fixed at creation and preserved through forks, as is commercial intent. Disabling platform forks does not prevent someone from copying an exported repository and is not a substitute for a license. Membership, conversations, actions and uploaded files are not duplicated into forks. The pilot supports at most 200 commits in an ancestry and refuses further growth rather than silently truncating a bundle.

Download a bundle from a mission history page, then use `git clone mission.bundle my-mission`. `git log`, `git diff`, and local branches work normally in the clone. Native Git bundle verification, clone, strict `fsck`, and merge-base checks are covered by the test harness. There is no hosted Git push/pull endpoint or synchronization of local edits back into the platform yet. The following contract describes that next layer:

- Workspace record: mission ID, repository provider and stable repository ID, default branch, accepted commit, visibility, asset-storage policy. Repository URL alone does not confer permission.
- A contribution starts from an exact accepted commit. Give each agent a separate checkout and branch. Record its starting commit, requested action, allowed tools, and budget.
- The agent returns a proposed commit and a plain-language account of changes. CI runs in an isolated executor. No execution of contributor code inside the web server and no shared writable checkout among agents.
- A maintainer reviews a diff and relevant previews. Merge only if the expected base still matches, or explicitly resolve a conflict and rerun the relevant checks. Never silently overwrite another contribution or auto-force-push an accepted branch.
- Record base/proposed/merged commit identifiers and review IDs in the mission activity log. Reconcile provider events idempotently; publishing to Git and updating D1 are separate systems, so use an outbox and retry/reconciliation state rather than pretending they share a transaction.
- Forks retain their upstream repository and commit and the applicable contribution terms. A mission fork is not permission to relicense contributions.
- Use Git for source, text briefs, manifests, and suitable editable design files. Use Git LFS or a versioned object store for large binary assets, with content hashes and sizes in versioned manifests. R2 alone is not a Git LFS server; an LFS protocol service or provider is still required. Binary CAD/Blender assets may require file locking or parallel alternatives and human selection rather than textual merging.

## Before enabling repository execution

Choose and connect an external repository provider with a scoped app installation, configure isolated runners, define repository/member access, enforce hard per-run budgets and cancellation, and test merge conflicts and webhook retries. These integrations are not configured in this release. No paid agent runs, GPU sharing, external repository provisioning, or manufacturing execution is implied by an action labeled “Agent-assisted work.” People can currently bring results produced with their own tools.

Costs to measure during that pilot are runner time, model usage, storage/version growth, large-asset bandwidth, and integration maintenance. Prices and budgets need provider-specific verification before activation; this document does not promise a cost per contribution.

## Primary references

- [Git branches and commit snapshots](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell.html)
- [Git LFS command documentation and pointer-based storage](https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs.adoc)
- [Git pack format](https://git-scm.com/docs/gitformat-pack)
- [Git bundle format](https://git-scm.com/docs/gitformat-bundle)

These explain the storage mechanisms. The architecture above is our proposed application design, not functionality already supplied by those tools.

## Working-file layer now implemented
The repository layer now includes small working text files alongside mission.json. Creators/maintainers can add, replace, or remove flat files with a commit description. All mission users can read the text. A fork inherits the source working files and ancestry; role memberships, conversations, action assignments, and separately uploaded binary artifacts do not carry over. The earlier definition-only statements describe the initial layer; this extends it without rewriting those earlier commits.

Safe portable names and text/size limits constrain the first editor (12 working files, 16 KB each, 64 KB total with the brief). Git objects retain 100644 file modes: no symlinks or executable file modes. Nothing in a working file is executed by the site. Workspace edits compare the expected head and log an idempotent request in the same transaction as the ref update. Updating a mission brief inherits the current working files. Native Git tests recover a removed file from the previous commit and verify that deleting it in a fork leaves the upstream file intact.

## Reviewed merges (implemented)
Fork creators can propose working files to their direct upstream. Each proposal captures a shared ancestor and immutable source and target heads. The upstream owner reviews file-level comparisons and explicitly selects a version for conflicts. Acceptance atomically advances the target ref and review record with a two-parent Git commit. Changed upstream heads require a fresh proposal. Subsequent proposals compare against current shared ancestry so previously reviewed changes are not replayed. Mission identity, brief, intent, participation, and conversations remain independent. This pilot supports 200 reachable commits, 12 working files, and 64 KB total text per workspace. Remote provider synchronization remains future work.
