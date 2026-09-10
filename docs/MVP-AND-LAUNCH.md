# Collaborator: MVP, scale, and launch budget

Prepared 10 September 2026. This is a founder planning document, not a supplier quote, spending authorization, or a forecast of user growth. The intended product remains a mission network that turns shared intent into action: a Mahabharata game, a beach cleanup, a movement, or an unusual physical invention. The first success is a useful collective outcome, not time spent scrolling.

## What exists now

The prototype has mission browsing, participation and conversations, membership, scoped subdivision leads, AI plan proposals and human approval, dependent tasks, task-linked artifact review, real per-mission Git history and forks, text workspaces, and accepted artifact references. The platform source and manifesto have their own public GitHub history.

The local companion supports Ollama and ChatGPT-connected Codex for planning and primitive Blender scene generation. It can also call a locally configured fixed read-only JSON API. Codex uses an isolated local sign-in profile, discovers available subscription models, requires consent to send the brief/context, and has no automatic API billing fallback. Blender exports editable blend/GLB files and a preview. A real Plus-backed Astra plan and Blender generation were tested on this PC; that does not establish general asset quality or multi-user readiness.

Codex is currently a bounded JSON-generation provider. This is not unrestricted Codex control of arbitrary tools or repositories. The adapter uses the experimental App Server protocol, disables shell/exec, apps, plugins and delegation, rejects approval requests, and uses Codex's built-in read-only permissions. That policy is not a general hostile-code isolation system. Native Windows was tested with Codex 0.153.4; other platforms and future protocol versions need compatibility tests. [OpenAI App Server](https://learn.chatgpt.com/docs/app-server), [permissions](https://learn.chatgpt.com/docs/permissions).

The running site is still private. Public GitHub source is not public access to the community. Unreal execution, a shared worker queue, large-file workflows, and a real multi-contributor trial remain unfinished.

## Basic MVP: finish in this order

| Priority | Implementation or refinement | Acceptance evidence |
| --- | --- | --- |
| P0.1 | Reliable onboarding and access | A newcomer receives an invite, joins one mission, connects their own agent, and submits a contribution without founder intervention. Test on a second PC and account, including browser local-network permissions, expired login, limits, and restart. |
| P0.2 | Complete one collaborative Mahabharata slice | At least two people use separate credentials, one produces an asset, another integrates it, a lead reviews it, and both see the same accepted history and usable result. Install and test the Unreal adapter; do not mark an unavailable editor ready. |
| P0.3 | Shared workspaces and binary handoff | Download immutable accepted inputs; create isolated per-task branches/worktrees; carry dependency revisions; import a reviewed GLB into a test Unreal project; reject stale/conflicting integration. Show visual comparisons for binary outputs. |
| P0.4 | Durable opted-in worker queue | Capability-based claims with leases, expiry, cancellation acknowledgement, bounded retries, per-user run caps, and idempotent output publication. A disconnected worker cannot overwrite newer work. Test two workers competing for one task and recovery after a PC restart. |
| P0.5 | Friendly supervision | Show what will run, which data leaves the PC, who pays, progress, actionable errors, previews, and one place to approve/request changes. Add plan-draft recovery and notification controls. Do not hide execution failures behind a generic “agent working” state. |
| P0.6 | Prove mission breadth | Run a small beach-cleanup-style mission with date, place, RSVP, roles, supplies and completion evidence. Run a design-only physical project with versioned drawings/BOM and review. Money pledges may be recorded, but pooled payments need a separate implementation and terms. |
| P0.7 | Operable and safe public pilot | Add report/block/moderation, abuse throttles, privacy/account deletion, full data backup and restore rehearsal, secret-safe logs, storage accounting, incident contact, and dependency/security review. Test accessibility, mobile layouts, and keyboard use. |
| P0.8 | Ownership and launch measurement | Adopt clear source and contribution terms, attribution, mission governance, and permissions for imported assets. Measure invitation → join → first meaningful contribution → accepted result → return contribution. Publish truthful capability and limitation statements. |

A private test can begin before all public-launch work is finished. A broad promotional launch should wait for P0.1, P0.2, P0.5, P0.7 and P0.8. The full shared-compute promise additionally depends on P0.3 and P0.4. Event/design trials prevent the UI from becoming a game-development-only product.

## What changes for scale

1. **Execution:** durable queues, heartbeats, capability/version negotiation, fair scheduling, cancellation/recovery, per-mission concurrency, explicit budgets and provider-specific limits. User-owned subscriptions remain independent authorizations; do not centralize credentials or assume transferable, unlimited quota.
2. **Artifacts and Git:** replace pilot caps with measured quotas, resumable uploads, checksums, malware scanning where applicable, retention/archive controls, binary locking where needed, Git LFS or equivalent object references, and efficient paginated history. Preserve exported artifacts alongside Git metadata.
3. **Data and application:** measure actual query/read/write and object-operation volume; add indexes, pagination and event delivery instead of aggressive polling; isolate hot missions; load-test failure modes. Use transaction boundaries for authorization, claims, review and publication. Avoid choosing microservices before measurements justify them.
4. **Tool ecosystem:** versioned adapter manifests, parameter schemas, scoped credentials, signed releases, safe updates, compatibility tests and constrained operations. Keep model intelligence separate from available machine tools. General arbitrary code execution needs substantially stronger isolation and review than today's JSON adapter.
5. **Community:** multiple accountable leads, moderation queues, role succession, appeals, stale-task release and contributor recognition. Search and recommendations should highlight attainable next actions and completed outcomes, rather than optimizing endless engagement.
6. **Independence:** replaceable authentication/hosting, authenticated APIs usable outside Sites, complete data export/restore, documented self-hosting, and disaster recovery. The current server trusts identity supplied by the Sites gateway; never expose it directly while trusting user-supplied identity headers.
7. **Operations:** monitoring, cost alarms and hard caps, backup restore drills, incident response, human support, accessibility checks and a maintainer rotation. A successful unit test is not a demonstrated service level.

Do not promise millions of users, arbitrary PC control, AAA output, or automatic physical manufacturing based on this pilot. Lift limits in response to measured workloads and successful recovery tests.

## “Critical user base” should mean working communities

There is no verified universal number at which this platform becomes self-sustaining. The following are proposed experiment gates, not industry benchmarks:

- Start with 3–5 tightly scoped missions, each with a dependable lead and 5–10 recurring contributors. Target 30–50 weekly meaningful contributors overall rather than thousands of dormant signups.
- Count a meaningful contribution as accepted task work, useful review, or verified real-world participation/supply delivery. A like or page view is not enough.
- Over four consecutive weeks, aim for at least two useful accepted outcomes per active mission per week, a median review wait below 48 hours, and at least 30% of first-week contributors making another meaningful contribution in week four.
- Track the founder's interventions. A mission that stops immediately without you is not yet a repeatable community. Have at least two missions whose leads can operate independently.
- Treat these thresholds as learning signals. Diagnose missed targets and adjust the product; do not manufacture tasks or count low-value actions to pass them.

Recruit around outcomes people already want: a small playable Mahabharata scene, a specific local cleanup, and an amusing but bounded design challenge. Publish real before/after artifacts with contributor permission, hold weekly building sessions, and make every shared result link to a concrete next task. Organic growth requires community work; it is not a zero-effort distribution strategy.

## Cost model and vendor anchors

The rupee amounts below are planning allowances in INR, not live foreign-exchange conversions or market salary quotes. The current Sites account's production billing and public-access limits have not been verified. The following Cloudflare prices are independent-hosting reference points; they are not a quote for this hosted Sites deployment.

- Workers Paid starts at **US$5/month**, including 10 million requests and 30 million CPU milliseconds; additional usage is charged. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- Standard R2 storage is **US$0.015 per GB-month**; operations are billed separately, and direct R2 egress is free. Before free allowances, 100 GB is about $1.50/month and 1 TB (1,000 GB) about $15/month for storage alone. Large builds, processing and distribution infrastructure add their own costs. [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- D1 Paid includes 25 billion rows read, 50 million rows written and 5 GB of storage monthly; excess charges apply. Queries can read many rows, so query count is not the billing unit. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).
- ChatGPT-connected Codex consumes the contributor's subscription allowance. API-key usage is separate usage-based billing. Plan limits are not a resource guarantee for the mission, and local hardware still costs electricity and availability. [Codex authentication](https://learn.chatgpt.com/docs/auth), [pricing](https://learn.chatgpt.com/docs/pricing).

Budget formula: fixed services + stored GB and operations + application requests/CPU + funded AI/render jobs + support/moderation + acquisition + contingency. Users alone do not determine cost. A few people running large generation/render jobs can cost more than thousands browsing text.

## Recommended first 90-day cash envelope

Assumptions: founder-built product; existing PC; 50–150 invited participants; 3–5 missions; contributors supply most AI and rendering; no wages, hardware purchases or unrestricted shared inference. Start this operating period when a usable private pilot is ready, not while the core loop is still being built.

| Item | Planning allowance |
| --- | ---: |
| Hosting, storage, backups, email and monitoring: ₹4,000 × 3 months | ₹12,000 |
| Optional hard-capped AI/testing support: ₹8,000 × 3 months | ₹24,000 |
| Community sessions and onboarding support: ₹6,000 × 3 months | ₹18,000 |
| Domain and basic identity assets | ₹1,500 |
| Targeted independent security/reliability review reserve | ₹30,000 |
| Contribution terms, ownership and privacy review reserve | ₹25,000 |
| Small mission demonstration/event materials | ₹15,000 |
| Contingency | ₹25,000 |
| **Base 90-day cash envelope** | **₹1,50,500** |
| Optional advertising experiment, only after retention evidence | **+₹20,000** |

I would reserve roughly **₹1.5–3 lakh** for a careful founder-led validation period, releasing it in stages. These are allowances, not quotes: a full security audit or complex legal structure may exceed the reserves. Get written scopes before engaging anyone. Much less can fund a small friends-only experiment, but that does not include the same readiness work.

Paid development is a separate and potentially dominant cost. For illustration, 400 purchased engineering hours at an assumed ₹1,500/hour adds ₹6 lakh; those inputs are arithmetic assumptions, not an estimate of remaining hours or a quoted rate. Add founder living costs separately. AI assistance does not eliminate integration, review, support or maintenance labor.

At a later small public community, reserve ₹30,000–₹1 lakh/month for platform operations, bounded experiments and community activity before salaries. This is a capacity envelope to refine with telemetry, not a forecast tied to a user count. Hiring or subsidizing heavy AI/video/render workloads can move the budget far above it. Approve new spend only after measuring cost per accepted outcome.

## Advertising and organic launch

Do not buy broad traffic while people cannot independently complete a contribution. First recruit a small relevant cohort through your existing communities and demonstrate an outcome. Any outreach messages or ad purchase require a separate deliberate action; none have been sent or bought here.

When the retention gates show promise, test at most ₹20,000 across two narrowly defined audiences with a clear stop date. Measure cost per **retained meaningful contributor**, not cheap clicks or signup count. For example, ₹20,000 producing 40 retained contributors is ₹500 each; producing only five is ₹4,000 each. These are sensitivity examples, not predicted conversion rates. Pause campaigns that cannot be justified against the mission's funding and retention.

Before that, prioritize onboarding calls, weekly building sessions, shareable completed work, and partnerships with one existing community. The platform's share loop should be “look what we made; here is how to help next.” Paid acquisition is optional if this loop produces repeatable referrals.

If “advertise” means earning revenue from ads, do not include it in the initial funding plan. Audience size, attention, advertiser demand and rates are unproven, and optimizing ad impressions can conflict with the action-first product. Optional supporter memberships, transparent mission sponsorship, grants, or paid hosting/support are hypotheses to test without selling ownership or contributor data.

## Ownership and funding decisions before public contributions

Resolve the relationship between community/noncommercial missions and the later ambition for companies to be born here. Define who owns contributions, what forks may do, whether community-controlled commercial activity is allowed, who may change terms, and how creators consent. These are governance and legal design decisions, not a checkbox a code generator can settle.

A blanket ban on business use is incompatible with the OSI Open Source Definition. Keep calling the current repository public source until actual terms are chosen; source visibility, community ownership, and open-source licensing are different properties. [Open Source Definition](https://opensource.org/osd).

Do not add custody of donated money, refunds, paid workers or manufacturing orders to the launch by accident. Each introduces separate payment, accounting, jurisdiction and operational responsibilities. Record voluntary commitments first; implement money movement after the contribution and funding model is agreed.

## Immediate next build milestone

After the Codex provider release, complete task input retrieval and a two-person artifact handoff, then durable worker leasing and Unreal integration. In parallel, run an onboarding test with one real collaborator and finalize pilot contribution terms. Publish a public launch claim only after the corresponding acceptance evidence exists.
