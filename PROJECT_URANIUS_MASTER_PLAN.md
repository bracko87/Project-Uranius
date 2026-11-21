# PROJECT URANIUS — Master project plan and acceptance checklist

**Project owner:** ProPeloton Manager owner  
**Primary implementation agent:** OpenAI Codex  
**Planning and independent review:** ChatGPT  
**Status:** Proposed / implementation not started  
**Plan version:** 1.0 — 21 November 2026  
**Protected release:** ProPeloton Manager, 10 December 2026  
**Target repository:** `Project-Uranius` (public, created; safe import pending)

## 1. Charter and boundaries

Develop and verify an independent clone of ProPeloton Manager with a hybrid cycling race simulation: calculate a complete baseline before the race, expose only elapsed race state, permit authorized live tactical commands, preserve completed history and recompute future race consequences, and render the authoritative state as a precise multi-group live view and completed replay. The existing game is not an implementation target. Success in Uranius does not authorize production migration.

Codex is the sole primary implementation agent for all Uranius changes: source code, frontend, backend, SQL, migrations, fixtures, policies, workers, automation, documentation, testing and sandbox deployment. ChatGPT prepares requirements, interprets findings, reviews commits and test evidence on request, and prepares follow-up instructions. The two sessions do not automatically share conversation history or communicate in real time. Repository documents and test reports are their shared record. The owner supplies access/approvals, product decisions and final user acceptance. Codex must report any missing tool or permission rather than assume it can provision infrastructure.

### Non-negotiable isolation

- Original GitHub repository `bracko87/ProPeloton-Manager`, its branches, production/staging databases, Netlify sites, existing scheduled jobs, storage and worker deployments: no writes, deployments, changes or test execution against them. Source acquisition is read-only. Do not pause existing systems or change production settings to isolate Uranius.
- Create a new public repository from a recorded source snapshot, with no push remote targeting the original. Disable copied Actions/deploy workflows before enabling sandbox execution. Audit even build scripts, hardcoded URLs, RPC targets, pinned raw GitHub imports, service clients, storage URLs, email/payment/analytics/webhook integrations and recovery jobs. Vendor or repin the complete required engine dependency closure into immutable sandbox-controlled source; preserve provenance and do not repoint production.
- Never copy real accounts, auth records/passwords, tokens, secrets, financial records, or identifiable player information. Use synthetic users/teams and sanitized game reference data with consistent relationships. Inspect copied source for secrets before committing; use a clean snapshot if history cannot be safely replicated. No production credentials in the Codex environment. Fail closed if the environment is not positively identified as Uranius. Disable live outbound payments, email, OAuth callbacks, webhooks and scheduled jobs until individually authorized for sandbox only.
- Separate Supabase project (not a schema in the production database) and separate Netlify test site or equivalent private sandbox hosting. Separate keys, Auth, Storage, functions, logs, cron, environment variables and callback URLs. Restrict test access. No Docker required on the owner's Windows CMD workflow. Initial unit tests use Node tooling and local fixtures without DB, network or secrets.
- No paid resource or extra AI credits without owner approval. Plan for the previously discussed approximate $10/month incremental Micro compute allowance, not a confirmed quote; verify eligibility, current pricing, taxes, storage/egress and quotas before provisioning. Prefer an eligible free project if sufficient; defer any new DB charge until integration requires it. No promise of a one-month completion time.

## 2. Existing engine — starting evidence and unknowns

Initial read-only repository inspection in the prior planning session identified the following areas. Codex must re-check the exact pinned snapshot and actual sandbox execution path. Presence of code does not establish production activation, correctness or compatibility. No live database audit or deployment verification has been done for this plan.

| Existing source | What the inspection supports |
|---|---|
| [src/universal-race-engine/](https://github.com/bracko87/ProPeloton-Manager/tree/main/src/universal-race-engine) | Universal race calculation and production input/output integration. |
| [Supabase worker](https://github.com/bracko87/ProPeloton-Manager/blob/main/supabase/functions/universal-race-stage-runner/index.ts) | Worker code imports production engine variants and fallback from specific commit pins; includes RPC helpers, authentication and lifecycle contracts. Inspect pass1/pass2/safe-resume and all effective pins as well. |
| [Netlify retired runner](https://github.com/bracko87/ProPeloton-Manager/blob/main/netlify/functions/universal-race-stage-runner.ts) | Source states authoritative race execution moved to Supabase Cron/Edge worker; Netlify handler returns 410. Verify actual sandbox path separately. |
| [Deterministic engine](https://github.com/bracko87/ProPeloton-Manager/blob/main/src/race-engine/simulation/runDeterministicRoadRace.ts) | In-memory TypeScript entry point with multiple simulation modes; no database or HTTP access in this entry point. |
| [Replay snapshots](https://github.com/bracko87/ProPeloton-Manager/blob/main/src/race-engine/simulation/replaySnapshots.ts) | Canonicalized timestamped rider/group snapshots and deterministic hashes; this does not prove complete resumable state, RNG state or live command support. |
| [Live-window bridge](https://github.com/bracko87/ProPeloton-Manager/blob/main/src/components/race/RaceReplayLiveWindowBridge.tsx) | Existing live replay control code includes a 15-minute live window and x1 speed-lock text. Audit actual timing policy and UI path; do not change the clock policy without a decision. |
| [V4 isolation research](https://github.com/bracko87/ProPeloton-Manager/blob/main/docs/race-engine-v4/ISOLATED_V4_SHADOW_EXECUTION_2026-11-05.md) | Historical report records a synthetic strict replay pass with no official writes and documents incomplete real-stage/shadow and production approval evidence. Reuse verified work; do not treat it as a release pass. |
| `src/race-engine/`, `src/race-engine-v4/`, `src/race-replay/`, `scripts/v4/` | Domain models, group mechanics, team orders, energy/fatigue, research adapters and tests identified by source inventory. Inspect exact dependencies and test coverage. |

Stack: React, JavaScript/TypeScript, Supabase/PostgreSQL/SQL, Recharts, Tailwind CSS, Node.js tooling, GitHub, Netlify; Deno-based Supabase workers where relevant. Retain existing stack and game mechanics where verified. Do not recode the engine from scratch without a documented gap and owner-approved scope decision. Verify which engine version and routing lane is active, what the existing pre-calculation persists, what the current replay consumes, when the results become authoritative, and how race timing is controlled. Document missing or inconsistent data explicitly.

## 3. Fixed functional requirements

- R01: Before a race starts, produce a baseline timeline and expected results from a fixed, versioned input, seed, ruleset and pre-race orders.
- R02: With no accepted live commands (or only rejected/no-op commands), the chosen baseline remains unchanged; the sandbox's initial baseline should also be compared to the existing engine. Baseline changes caused by intentional engine upgrades require documented acceptance, not silent changes.
- R03: Allow authorized managers to command their own eligible riders during the live window. Initially attack; then chase/follow, support/work, effort controls only as approved. Existing AI and pre-race plans continue where causally valid.
- R04: On accepted command, reconstruct exact authoritative state at effective simulation tick from a resumable checkpoint and ordered command history. Recalculate future affected interactions; repeated commands build on the latest accepted revision. Prefer simple deterministic continuation of all interacting riders before optimizing selective recomputation; do not freeze indirectly affected riders or splice inconsistent trajectories. Keep unaffected decisions/random streams stable where feasible. Do not force a command to guarantee victory or a visible change if physically impossible.
- R05: Immutable elapsed history (positions, events, energy, incidents, intermediate results) before the effective command. Define deterministic boundary semantics for the command tick. Server chooses effective time; no backdating or modification of already revealed state. Atomic replacement of the future timeline only.
- R06: Realistic speeds and group behavior derived from input/rider attributes, terrain, effort, fatigue, cooperation and tactics. Reuse existing validated mechanics, including crash/DNF/DNS and weather where applicable.
- R07: Per-group moving line/marker on current profile or compatible UI with exact kilometer positions, group membership/count, stable identity and lifecycle. Isolated rider can be a group of one. Group markers share scale; if visually indistinguishable, use zoom/labels without falsifying distance.
- R08: Compute spatial separation from actual positions at the same timestamp; time gaps from comparable crossing times (or explicitly labeled live estimates if not yet observable). Never use a fixed km-per-second conversion across terrain. Interpolate between valid samples; do not invent results. Distinguish simulation time, real display time and game clock.
- R09: Groups split/merge according to simulation state or verified derived membership logic with suitable hysteresis; preserve all active riders exactly once and handle finish/DNF status. No phantom markers.
- R10: Server-authoritative race time and commands. Ordered/idempotent command acceptance, ownership/eligibility validation, concurrency controls, versioned timeline publication, reconnection/resync, no client access to unrevealed baseline/future events or privileged state. All observers converge on the same revision.
- R11: Official sandbox results only after actual race ends; standings, finish times, points, prizes and fatigue applied once using authoritative completion. No speculative baseline payouts/publication before finish. Multi-stage state and existing classifications remain compatible.
- R12: Completed replay reads immutable final timeline, including accepted tactical commands and their effects; speed controls/scrubbing available according to existing policy. Live pause/scrub cannot change authoritative clock.
- R13: Full sandbox integration with current schedule, race preparation, teams, AI, multi-stage rules, rankings and game economy contracts. Existing game unrelated functionality must pass regression tests.
- R14: No production changes or shared credentials. No deployment or migration into original game without separate explicit owner approval after Uranius acceptance.

### Technical decisions to record before implementing affected tasks

1. Real-time live commands with optional existing pre-race instructions is the target. Map simulation seconds to the actual live window and establish command deadline, tick interval, real-time latency budget and offline-manager behavior using the existing timing rules. Any material changes require owner decision.
2. Set reproducibility, rider-count, race-length, tick/sample intervals, checkpoint size, event semantics, storage and compute budgets using measured baseline. Suggested starting experiments: 10 riders/10 km; 1–5 s simulation tick and 5–10 s visual sampling, not final specifications.
3. Define time-gap reference (leader passage at a common distance; current live estimates when needed), group rules and threshold hysteresis. Calibrate from existing race behavior and agreed fixtures.
4. Choose execution host after benchmark. Existing Supabase workers may be suitable; consider a separate Node worker only if measured constraints justify it. Do not introduce a paid service without approval.
5. Define behavior on command rejection, concurrent commands, expired live window, failed recomputation, stale client and worker restart. Default: server validates, atomically commits new revision, retains last valid state on failure, never silently publishes stale results after an accepted unapplied command.

## 4. Project delivery workflow — 60 tasks, five gates

Each task has a stable ID and an acceptance criterion. Initial status for all is TODO. M1–M4 may run without a paid database; the complete relational clone is provisioned in M5. If an earlier task genuinely requires database integration, record the dependency and obtain owner authorization before reordering; no informal scope expansion. All work happens in Uranius only. Use exactly one task at a time in Codex, with a focused context, small commit, actual tests and evidence. Automatically continue to the next task only in an active authorized Codex session after passing the current one (not a promise of unattended future work). If blocked, record the blocker and stop that task; never mark it complete on code existence alone.

### Milestone 1 — Source clone, Codex connection and safety (12 tasks)

- [ ] **U1.01 — Freeze source provenance.** Record source commit, tree ID, release configuration references and known worker pins; audit performed read-only. **Pass:** source snapshot and references documented; no original writes.
- [ ] **U1.02 — Create public Uranius repository (owner-approved).** Owner authorizes creation; initialize independent destination. **Pass:** repository URL/owner verified and no upstream push target or original production CI access.
- [ ] **U1.03 — Copy entire application.** Import sanitized source with lockfiles and required assets, excluding secrets and unsafe private records/history. **Pass:** manifest matches approved source except documented sanitization; scanner passes before upload; original unchanged.
- [ ] **U1.04 — Disable copied execution paths.** Disable deploy workflows, schedules, outbound integrations and any automatic DB access before first run. **Pass:** no production workflow or outbound job can run from new repo.
- [ ] **U1.05 — Inventory environment dependencies.** Locate all hardcoded endpoints, keys/config placeholders, auth/redirects, DB clients, storage, worker imports and scripts. **Pass:** cross-reference inventory and remediation list with zero unreviewed external execution targets.
- [ ] **U1.06 — Isolate engine dependency closure.** Copy approved pinned engine versions and transitive imports under sandbox control; record source hashes. **Pass:** reproducible builds/tests without mutable original imports; original pins unchanged.
- [ ] **U1.07 — Connect Codex.** Owner connects GitHub and selects the independent Uranius repository/environment, not production. **Pass:** Codex reports correct repository, commit, working directory, allowed targets and no production credentials before any writes.
- [ ] **U1.08 — Transfer project context.** Install AGENTS.md, this master plan, checklist and starter handover; record previous review findings and owner rules. **Pass:** Codex reads documents and summarizes requirements, risks and next task correctly.
- [ ] **U1.09 — Establish offline build/test.** Inspect scripts before executing; install locked dependencies and run credential-free Node/CMD smoke tests. **Pass:** reproducible command log, no Docker requirement, network/DB dependencies isolated or mocked; known inherited build failures documented.
- [ ] **U1.10 — Design sandbox infrastructure.** Define distinct DB, Auth, Storage, workers, site, credentials, access gates and cost cap; no provisioning yet. **Pass:** infrastructure map, expected project allowlist and budget approval requirement documented.
- [ ] **U1.11 — Add fail-closed guards.** Sandbox-only assertions in deployment/migration/admin paths; reject wrong or missing project IDs and endpoints. **Pass:** automated negative tests fail safely with production-like identifiers and missing configuration, without contacting production.
- [ ] **U1.12 — Verify milestone.** Review source clone, access, build, guards, secrets and CI. **Pass:** isolated source lab is ready, credential-free, original unmodified by Uranius, reports committed. No paid DB or test website required yet.

**Gate 1:** Source clone and Codex environment are independently usable for offline work. No original repository/database writes. Do not start mechanics until the guard/evidence checks pass.

### Milestone 2 — Existing engine audit and deterministic baseline (12 tasks)

- [ ] **U2.01 — Map race lifecycle.** Trace scheduler, eligibility/startlist, preparation locks, input, worker/resume lanes, persistence, publication, live view and finish. **Pass:** CURRENT_RACE_ENGINE.md with source refs and verified vs unknown labels.
- [ ] **U2.02 — Map engine versions and prior experiments.** Compare universal, deterministic and V4 candidates; pin the chosen starting engine and reusable modules. **Pass:** decision matrix with actual tests or source evidence; no assumption that V4 is production.
- [ ] **U2.03 — Inventory current contracts.** Document rider stats, course, terrain, team orders, fatigue/energy, weather, incidents, finish rules, and DB tables/RPCs from source/migrations. **Pass:** schemas, units, invariants, and missing schema evidence enumerated; deployed drift identified as requiring later verification.
- [ ] **U2.04 — Audit timeline and replay consumers.** Identify current snapshot content, timestamps, group IDs, finish/DNF and gap semantics, persistence, replay input and rendering logic. **Pass:** end-to-end map of calculated vs reconstructed vs missing information and known discrepancies.
- [ ] **U2.05 — Set contracts and decisions.** Define versioned RaceInput, RaceState, Command, Event, RaceTimeline, Checkpoint and Result schemas; record clock/timing and group semantics. **Pass:** schema validation tests and documented owner decisions or clearly identified blockers.
- [ ] **U2.06 — Create micro-fixtures.** 10 riders, 10 km, flat/climb/descent, known group split/catch and finish cases, plus constant-speed math fixtures. **Pass:** hand-computed expected positions, times and memberships; all data synthetic and reproducible.
- [ ] **U2.07 — Verify existing no-command baseline.** Run selected existing engine offline on fixtures; pin reference results and hashes. **Pass:** repeated same-input/seed results identical or nondeterminism precisely diagnosed and fixed within the sandbox.
- [ ] **U2.08 — Validate single-rider motion.** Reuse or adapt movement calculations; check position progression and terrain speeds at known timestamps. **Pass:** numerical tolerance recorded; flat/climb/descent tests pass without invented speeds.
- [ ] **U2.09 — Validate group and energy mechanics.** Test split, catch, merge, fatigue, effort, drafting and team-order behavior with small fixtures. **Pass:** rider conservation, status/energy limits, deterministic expected events; no double-counting.
- [ ] **U2.10 — Validate time gaps and timeline.** Check common-point crossing times, spatial distances, stable group IDs and elapsed events. **Pass:** independent expected values match; monotonic positions except documented states; timeline schema valid.
- [ ] **U2.11 — Test representative field sizes.** Run flat, hilly, mountain, relevant existing race formats and incidents with realistic synthetic rosters. **Pass:** baseline comparison, timing/size measures and deviations documented; chosen thresholds approved before gate.
- [ ] **U2.12 — Freeze verified baseline and gap list.** Summarize reusable code, blockers and precise changes needed for hybrid continuation. **Pass:** fixture golden outputs, baseline commit, test report and acceptance criteria frozen; no unapproved sporting rule changes.

**Gate 2:** Existing engine understood and a reproducible baseline with actual time-indexed state exists. If it cannot supply required state, repair only identified gaps; do not proceed on guessed data.

### Milestone 3 — Hybrid simulation and tactical commands (12 tasks)

- [ ] **U3.01 — Complete resumable state.** Define full state with simulation clock, rider status/energy, group/AI state, pending events, RNG streams and engine version. **Pass:** serialize/restore round trip preserves the canonical state and future behavior.
- [ ] **U3.02 — Checkpoint/continuation engine.** Resume at effective tick from checkpoint plus history. **Pass:** uninterrupted baseline equals checkpoint-resumed baseline at multiple timestamps.
- [ ] **U3.03 — Command contract and ordering.** Define unique command IDs, owner/team/rider, type, payload, accepted effective tick, sequence and expected revision. **Pass:** invalid, duplicate, out-of-order and late inputs have deterministic policy results; no backdating.
- [ ] **U3.04 — No-command invariance.** Compare full baseline vs hybrid mode with empty log, rejected and true no-op orders. **Pass:** identical timeline and official result hashes for same ruleset/input/seed.
- [ ] **U3.05 — Single attack test.** Apply one authorized attack at fixed tick in small fixture. **Pass:** pre-command history byte-identical; valid changed future in designed scenario; appropriate effort cost and final result derived from future state.
- [ ] **U3.06 — Future causality.** Preserve prior valid decisions/random streams; allow affected groups/AI to respond. **Pass:** no impossible positions, stale group membership, duplicated events or independent rider teleports; unaffected isolated cases stable.
- [ ] **U3.07 — Repeated commands.** Apply a second command after first continuation. **Pass:** operates on current accepted revision, preserves already revealed history and produces exactly one authoritative successor.
- [ ] **U3.08 — Chase and follow.** Add approved chase/follow rules using existing team/tactical mechanics. **Pass:** fixture demonstrates merge or gap behavior and resource trade-offs, with deterministic outcomes.
- [ ] **U3.09 — Support/work/effort.** Add approved actions and energy/fatigue constraints; do not invent balance rules. **Pass:** fixture validates intended effects, limits, impossible-action behavior and no guaranteed win.
- [ ] **U3.10 — Server authority in test harness.** Implement intake/authorization and revision interfaces with in-memory/test persistence first. **Pass:** ownership/eligibility checks, concurrency ordering, idempotency, no exposure of unrevealed future data; no DB credentials needed.
- [ ] **U3.11 — Recovery and finalization.** Test cancellation/rejection, worker interruption and continuation recovery, late commands and end-of-race result sealing. **Pass:** last valid revision preserved, accepted commands recover safely, final result generated once, no speculative payouts.
- [ ] **U3.12 — Hybrid gate benchmark.** Run baseline and command scenarios across supported terrain/field sizes and multi-manager synthetic command sequences. **Pass:** deterministic replay of command log, immutable prefix, agreed latency/CPU/memory budgets and sporting behavior; evidence committed.

**Gate 3:** Pre-calculation plus live-command continuation works headlessly and can be reproduced from inputs and command history. No frontend can conceal a broken simulation. If latency exceeds approved thresholds, benchmark and fix before integration.

### Milestone 4 — Accurate live view and completed replay (12 tasks)

- [ ] **U4.01 — Isolated replay fixture viewer.** Create component using known fictional timeline; no DB or engine calls. **Pass:** renders start, split and catch/merge with expected group counts.
- [ ] **U4.02 — Course and axes.** Use true distance and elevation profile, consistent scaling and markers. **Pass:** expected position pixels/data coordinates checked at known locations and screen widths.
- [ ] **U4.03 — Time-driven positions.** Render samples/interpolation against simulation clock, not progress percentage. **Pass:** exact checkpoint positions and bounded interpolated movement; no reverse/teleport artifacts.
- [ ] **U4.04 — Terrain-dependent speed.** Render variable motion from actual timestamped positions. **Pass:** known slower climb/faster descent fixture matches engine movement; UI does not calculate independent physics.
- [ ] **U4.05 — Separate group markers.** One line or marker per active group, identity/count and meaningful labels. **Pass:** all groups exactly once, no phantom or missing group; close gaps shown without falsifying distance.
- [ ] **U4.06 — Real gaps and distances.** Display actual spatial difference and time gaps with consistent reference semantics. **Pass:** hand-computed and uneven-terrain examples match; estimated gaps labeled where required.
- [ ] **U4.07 — Group split/formation.** Consume actual membership changes/event timestamps. **Pass:** correct riders and stable identity across split, no duplicate riders or flickering.
- [ ] **U4.08 — Merge/finish/DNF.** Render catch and merge, singleton riders, finish and withdrawn states. **Pass:** merged groups replaced once, completed/dropped riders correctly accounted for.
- [ ] **U4.09 — Playback controls.** Smooth animation, responsive profile, completed replay pause/scrub/speed, live restrictions. **Pass:** engine time unchanged by UI; accessibility and responsive checks; no access to future live samples.
- [ ] **U4.10 — Connect hybrid timeline revisions.** Consume versioned state from test harness. **Pass:** accepted command replaces only future stream; no jump to stale baseline or rewind of completed history.
- [ ] **U4.11 — Live controls and reconnection UI.** Wire command acknowledgement, pending/rejected state, resync and reconnect. **Pass:** two test clients display same authoritative current revision and clear feedback; unauthorized attempts rejected.
- [ ] **U4.12 — Visual regression acceptance.** Compare full replay and live display to authoritative synthetic fixture/events/results across devices. **Pass:** numeric synchronization tests plus recorded screenshots/videos or manual checks; no misleading gap or group state.

**Gate 4:** Integrated test-harness engine and viewer accurately show the race, including command effects. This is the go/no-go decision before paying for additional sandbox infrastructure.

### Milestone 5 — Database, full clone integration and acceptance (12 tasks)

- [ ] **U5.01 — Authorize and provision isolated infrastructure.** Verify cost and owner consent; create separate Supabase project and private test site with unique credentials. **Pass:** distinct project refs/accounts/config verified; original credentials absent; owner access established; paid services only as approved.
- [ ] **U5.02 — Reconstruct existing sandbox DB.** Inventory schema, functions, triggers, policies, grants, extensions, schedules, storage and migrations; apply reviewed DDL to sandbox only. **Pass:** sandbox schema manifest, migration log and drift/gap audit. No production bulk restore or users; schedules/outbound hooks remain off.
- [ ] **U5.03 — Seed full test world.** Populate required routes, riders, teams, calendar, equipment/reference tables, balances and test accounts with synthetic/sanitized data. **Pass:** integrity constraints and baseline game smoke tests pass; no production PII or secrets; sandbox game login works.
- [ ] **U5.04 — Implement hybrid DB contracts.** Add or reuse versioned race inputs/runs, checkpoint metadata/state, commands, timeline revisions/events/chunks and finalization records; migration/rollback tests. **Pass:** uniqueness, transactional ownership, referential integrity and restart-safe persistence tested on correct project only.
- [ ] **U5.05 — Secure sandbox APIs and storage.** Implement RLS, explicit grants, worker-only write privileges, elapsed-only public read projection, storage access and Realtime isolation. **Pass:** anonymous/other-manager/future-data negative tests, ownership tests and database/security advisors reviewed. No privileged key on client.
- [ ] **U5.06 — Deploy sandbox workers and schedule.** Adapt existing scheduler/runner/resume functions with sandbox pins, allowlists, leases and retry handling; enable only test schedules after review. **Pass:** synthetic scheduled race claims once, resumes safely and publishes only to sandbox; workspace/site environment verified before deploy.
- [ ] **U5.07 — Integrate complete clone.** Connect input/output adapters, race preparation, live tactical UI, replay and sandbox feature flag; keep original engine selectable within Uranius for comparison. **Pass:** independent deployed test site works, toggle can revert sandbox to verified baseline; no original connections.
- [ ] **U5.08 — End-to-end no-command and active-manager races.** Run flat and climb scenarios with offline/online managers and at least two synthetic teams issuing commands concurrently. **Pass:** empty log baseline exact; active commands reflected in future view and final results; both clients stay synchronized.
- [ ] **U5.09 — Multi-stage and game accounting tests.** Verify stage/GC/points, fatigue/injuries, classifications, team results and reward/finance updates per existing rules. **Pass:** exactly-once persistence, no double payouts, no premature publication and correct carryover; relevant race types and known defaults covered.
- [ ] **U5.10 — Performance, recovery and regression.** Benchmark representative fields/durations, storage, worker CPU/memory, command latency, reconnect, retries and load; run unrelated game regression suite. **Pass:** approved budgets met and no blocking regression/security failure; compare against existing-engine baseline inside sandbox.
- [ ] **U5.11 — Owner acceptance and evidence.** Provide sandbox URL, test login via safe channel, clear test cases, known limitations and demonstration of no-command, attack, catch/merge, multi-stage and replay. **Pass:** owner explicitly accepts or issues tracked defects; all critical defects resolved or gate remains blocked.
- [ ] **U5.12 — Handover and future migration plan.** Deliver sandbox release tag, source package/diffs, schema migrations, tests, evaluation, operating cost summary, rollback and proposed later integration strategy. **Pass:** all 60 tasks have evidence, gates passed, owner acceptance recorded; original game remains unchanged by Uranius. No production merge/deploy.

**Gate 5:** Full working sandbox is accepted and a migration proposal exists. The project ends here. Any original-game integration must be separately authorized and planned.

## 5. Database implementation workstream

Codex owns SQL, schema reconstruction, migration creation, implementation, integration, verification, security and rollback tests for Uranius, provided it has the appropriate sandbox tools/credentials. Owner handles only account provisioning, secure credential setup or explicit costs/permissions when those cannot be delegated. Use official current Supabase documentation when implementing, inspect tool/CLI help, and verify every migration on the correct sandbox. No Docker required in the owner's local workflow. Use remote isolated sandbox DB or existing Node test harness; no production service-role key in Codex.

| Area | Uranius design requirement | Verification |
|---|---|---|
| Original game schema | Reconstruct from versioned migrations and approved read-only schema evidence; include tables, views, functions/RPCs, triggers, types, indexes, extensions, grants/RLS, Auth/Storage setup and dependencies | Schema manifest/diff, dependency order, integrity smoke tests |
| Synthetic game world | Seed fictional test managers/teams and safe game reference data; consistent FK relationships and test calendar | Auth login, valid roster/startlist, reference and race lifecycle tests |
| Race input/run | Immutable versioned input, course, roster, seed, ruleset/engine version, start clock mapping and baseline provenance | Hash/uniqueness, repeatability |
| Checkpoints | Complete serializable state, timestamp/tick, revision and integrity hash, including RNG/AI state | Resume equality across timestamps |
| Tactical orders | Append-only accepted command log; unique idempotency key, owner/rider validation, server timestamp/tick, sequence, revision, status | Unauthorized/duplicate/late/concurrent tests |
| Timeline revisions | Versioned immutable history chunks and replaceable future continuation; maintain baseline privately, atomic publication of active revision, event provenance | Prefix equality, stale revision rejection, coherent rollback/recovery |
| Read projection | Live data only through elapsed-time boundary; completed replay only after permitted finalization; no public access to future baseline, seed or full checkpoints | RLS/API/Realtime/storage negative tests |
| Official sandbox result | Authoritative final run, finish status, standings/classifications and exactly-once downstream effects | Retry idempotency and no duplicate points/finance/fatigue |
| Worker lifecycle | Sandboxed claims/leases, heartbeat, retry/recovery, crash handling, dead-letter policy and logs | Simultaneous claim and fault injection tests |
| Retention/performance | Benchmark timeline size before deciding JSONB vs chunked/compact storage; indexes, quotas, cleanup limited to sandbox | CPU, memory, latency, storage and query plans against approved budgets |

Names above are logical responsibilities, not approved table names or migration SQL. Codex must reuse compatible existing DB contracts or add compatible structures after audit; no destructive schema changes merely for convenience. Versioned SQL changes must be committed and reviewed, test on fresh sandbox and upgrade path, test rollback/recovery, run appropriate advisors, and log before/after evidence. Any production schema comparison is read-only, optional and performed without giving Uranius production write credentials.

## 6. How Codex and ChatGPT work together

1. Owner creates/authorizes the public GitHub repository and connects Codex to it (browser via https://chatgpt.com/codex or local Codex with the sandbox directory). Do not select original game as the coding target. If a new repo cannot be created by the currently available connector, owner makes the empty public repo and provides its URL; source clone remains read-only from original.
2. Upload/commit the handover files (`AGENTS.md`, `PROJECT_URANIUS_MASTER_PLAN.md`, `MASTER_CHECKLIST.md`) to the public repository. Avoid committing secrets. Give Codex the kickoff prompt from `CODEX_KICKOFF.md`.
3. Codex reads the repository files, works on the next precise task, executes checks and commits evidence. It must report next task ID and actual remaining usage/permission blockers if exposed by its environment; it may not assume ChatGPT context.
4. On request, ChatGPT reviews the Uranius repository, reads test evidence and responds with technical feedback or updated owner-approved requirements. No automatic live conversation between agents. Codex reads the updated docs on next session. All actual implementation is done by Codex.
5. Owner does not need to manually code, write SQL or repeat game requirements. Owner handles genuine permissions, infrastructure authorization, product decisions and acceptance. Use GitHub document history rather than repeatedly pasting the complete plan.

### Required persistent documents

- `AGENTS.md`: isolation, task-loop and completion rules.
- `PROJECT_URANIUS_MASTER_PLAN.md`: fixed requirements and 60 task-level acceptance definitions.
- `MASTER_CHECKLIST.md`: authoritative progress with TODO/IN_PROGRESS/BLOCKED/PASS and test/commit evidence for every ID.
- `CURRENT_RACE_ENGINE.md`: actual current-engine architecture, provenance, data flow, versions, known unknowns.
- `ARCHITECTURE.md` and `CONTRACTS.md`: design and schemas; approved numeric budgets and timing.
- `PRODUCTION_PROTECTION.md`: allowed resource IDs, guard tests and safe setup; no secrets.
- `DB_MIGRATION_PLAN.md`: schema mapping, seed data, policies, migrations, recovery, deployment order.
- `TEST_REPORT.md`: commands, fixture IDs, expected/observed results, performance, CI links, regression coverage.
- `DECISION_LOG.md` and `BLOCKERS.md`: decisions, rationale, scope control and precise next action.
- `INTEGRATION_PLAN.md`: sandbox integration, later original-game migration proposal, feature flag, rollback, no production action.

### Progress report format (after every task)

```
Task: Ux.yy — title
Status: PASS / BLOCKED / IN_PROGRESS
Scope: one task only
Acceptance: expected versus observed results
Evidence: test commands, results, changed files, commit/CI reference
Production isolation: verified allowed sandbox targets / no original writes
Progress: N/60 passed; milestone N/12 passed
Blocker or decision required: none / exact action needed
Next task: Ux.yy
```

PASS requires the task's acceptance criterion, automated evidence where feasible, required manual evidence if applicable, and commit reference. Tests not run or inaccessible are not passing tests. Existing reusable code can satisfy a task only after it is verified. No unrelated refactors or production fixes. Time/usage constraints: stop at clean commit or report blocked; resume from checklist. Limit repeated failed attempts, diagnose and escalate rather than looping. The five gates require review of evidence; only cost, material game design, security exceptions, final acceptance and any later production work require explicit owner authorization. No scope changes without written decision.

## 7. Mandatory final tests and project stop rule

Final acceptance evidence includes: identical no-command baseline; valid attack and second command; chase/catch/merge; group position/time-gap synchronization on varying terrain; unauthorized/late/duplicate commands; concurrent managers and reconnect; crash/resume; private future data; authoritative final result and exactly-once rewards; multi-stage carryover; sandbox regression and performance; original-resource isolation. Critical failures are release blockers. Where no validated numeric threshold exists, set it before the corresponding test and record it; do not weaken it after observing failures without owner-approved rationale.

Final deliverable is a sandbox-only working version, test/acceptance report and later migration proposal. Future production adoption would require a new authorized project with source diff review, version compatibility, schema/migration review, isolated staging, shadow comparison, backup and rollback, staged rollout, and safety around active races. None of those production operations is authorized in Uranius.

## Owner-approved setup update — 21 November 2026
The target repository `bracko87/Project-Uranius` is PUBLIC by explicit owner decision. No production secrets, personal data, private operational data or unsafe Git history may be published. The local clone is at `C:\Users\Aleks\Desktop\Project-Uranius`, detached at `d12021abbba40aec62b13c5c5184f69a3c676d7d`, with no remotes according to owner CMD output. GitHub Actions disabling was selected; saved setting not independently verified. Codex CLI sandbox is ready. These facts are preliminary evidence, not automatic task passes. The first local scan found a hardcoded Supabase fallback URL/JWT in `src/lib/supabase.ts`, tracked `supabase/.temp/` connection metadata, production references in SQL, analytics, auth, scripts, worker imports and 156 workflows. Treat copied scripts and SQL as untrusted execution targets. Do not run the app or copied scripts, access any production resource, add a push remote, commit to the inherited history or publish anything yet. Work locally with network restricted. Inventory and sanitize, quarantine unsafe workflows and SQL without losing necessary schema logic, remove credentials and fail closed without explicitly approved sandbox configuration. Scan for diverse secret formats, data dumps, personal data, device/config metadata and outbound targets; report filenames and categories only, never values. Prepare a clean history-free export separately, not a push of the inherited Git history. Stop for review before any public upload, network access, paid provisioning or sandbox deployment. Record exact evidence and unresolved blockers. Preserve the fixed 60-task scope and count only verified passes.
