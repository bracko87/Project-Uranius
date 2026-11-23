# Test report

## U1.01 — Freeze source provenance

Local evidence from 21 November 2026. Scope was read-only Git metadata and tracked source inspection. The four handover documents are at the workspace root.

| Check | Expected | Observed |
|---|---|---|
| `git rev-parse --show-toplevel` | Uranius workspace | `C:/Users/Aleks/Desktop/Project-Uranius` |
| `git rev-parse HEAD` | Owner-recorded source commit | `d12021abbba40aec62b13c5c5184f69a3c676d7d` |
| `git rev-parse HEAD^{tree}` | Resolvable source tree | `9defd3ebee964be4d65f3a0d29b69e58d73ab89c` |
| `git symbolic-ref -q HEAD` | Detached checkout | Exit 1 |
| `git remote` and `git config --local --name-only --list` | No configured original remote | No remote output, only core keys in local config |
| `git ls-tree -r --name-only HEAD` with release path filters | Locate tracked workflow, hosting, worker and database release surfaces | 156 GitHub workflow files, `netlify.toml`, `netlify/functions/`, `supabase/functions/`, `supabase/migrations/`, and eight tracked `supabase/.temp/` files. No tracked `supabase/config.toml`. |
| `git grep -n -i -e raw.githubusercontent.com HEAD -- supabase/functions netlify/functions` with output restricted to path and SHA | Record direct immutable engine references without retrieving content remotely | Seven files and 27 distinct file/pin pairs, enumerated below |

The tracked deployment surfaces are source references. The live release settings and the transitive engine closure remain unverified. No original application, scripts or SQL ran. No network calls or writes to original resources occurred.

| Worker path | Direct source pin |
|---|---|
| `supabase/functions/breakaway-full-engine-canary/index.ts` | `e00c4e694c0629efa5b06497dd514b505b166934` |
| `supabase/functions/road-physics-calibration-canary/index.ts` | `39f20657dd37c44a6b27fb2e5e96e02eb57ad9a4` |
| `supabase/functions/universal-race-stage-pass1-resume/index.ts` | `878aa8ae0db95d97fa5385513d2c1394e3a791a2` |
| `supabase/functions/universal-race-stage-pass2-resume/index.ts` | `38fec7814395d77331ae255d1b9203edba0142c7` |
| `supabase/functions/universal-race-stage-pass2-resume/index.ts` | `726682eaf58385c4d60a9b664d2b9696b8cfc1a0` |
| `supabase/functions/universal-race-stage-pass2-resume/index.ts` | `7bb8cffa1631077d893f60ae0d10bbde3803b751` |
| `supabase/functions/universal-race-stage-pass2-resume/index.ts` | `7e4299371f452e5d1d0a706e48fb083340362d11` |
| `supabase/functions/universal-race-stage-pass2-resume/index.ts` | `878aa8ae0db95d97fa5385513d2c1394e3a791a2` |
| `supabase/functions/universal-race-stage-pass2-resume/index.ts` | `92de26698126e646f6ecc4ae74455bfc831e66c2` |
| `supabase/functions/universal-race-stage-runner/import_map.json` | `c0069963ccd0ba7f896e2566249647ae7d3879ed` |
| `supabase/functions/universal-race-stage-runner/index.ts` | `726682eaf58385c4d60a9b664d2b9696b8cfc1a0` |
| `supabase/functions/universal-race-stage-runner/index.ts` | `7bb8cffa1631077d893f60ae0d10bbde3803b751` |
| `supabase/functions/universal-race-stage-runner/index.ts` | `878aa8ae0db95d97fa5385513d2c1394e3a791a2` |
| `supabase/functions/universal-race-stage-runner/index.ts` | `90fc6ce06197f4537b6088d30252b60025f39253` |
| `supabase/functions/universal-race-stage-runner/index.ts` | `92de26698126e646f6ecc4ae74455bfc831e66c2` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `643039a7e78b814c62499eb3a84ed38b2d138e73` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `70553d2334f057f796d50a2bfa6ad5fec4da3da2` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `726682eaf58385c4d60a9b664d2b9696b8cfc1a0` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `7bb8cffa1631077d893f60ae0d10bbde3803b751` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `878aa8ae0db95d97fa5385513d2c1394e3a791a2` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `8db593c61bfe0193d281a116a0028d47b54dfee7` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `92de26698126e646f6ecc4ae74455bfc831e66c2` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `a9ad36c6f9eb9c5864cec8827f8eb57669bf0d72` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `e00c4e694c0629efa5b06497dd514b505b166934` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `ed919bdf870f3c8a081eba9b5e36806d284b289c` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `ef5f0d4f2a91be80834140fbda977b5da614908b` |
| `supabase/functions/universal-race-stage-safe-resume/index.ts` | `fa93be2b6e4d8aeb4200caa3dcf82a1b4dcb8cf2` |

## U1.02 — Verify the independent GitHub destination

Expected evidence is the exact GitHub owner and repository identity, absence of an upstream push target and absence of original production CI access. The local no-remote check passed. GitHub ownership, visibility, saved Actions setting and isolation remain owner-reported or unverified. No remote check was run because network access is held for review. Status: BLOCKED. See BLOCKERS.md.

### U1.02 follow-up — PASS

With explicit destination-only read authorization, `gh api repos/bracko87/Project-Uranius` returned the exact full name, visibility public, private false and archived false. The repository Actions permissions GET returned enabled false and allowed_actions null. Both GETs succeeded. Local `git remote -v` was empty, and HEAD remained at the recorded inherited source commit. The new destination cannot run copied GitHub Actions while that setting is in effect. External hosting settings were outside this read authorization and remain part of the pre-upload review.

The U1.02 verification was committed to the independent local evidence repository as `47665ee30b76187347295e4fa28a9416b4fca3a6`.

## U1.03 — Copy entire application (in progress)

An initial source-only draft is in `.uranius-export-draft/`. The CSV classifies all 2,568 inherited tracked paths. It records SHA-256 checksums for the 484 included files. Count, uniqueness, and all included checksums matched. The draft excludes Git metadata, GitHub workflows, Netlify configuration, Supabase CLI state and SQL, and inherited script directories. It omits 2,084 paths pending triage, replacement, or documented exclusion. Excluded source remains in the inherited checkout for offline review.

A filename-only tracked-source scan matched known credential formats in `src/lib/supabase.ts`. The working-copy file and draft copy remove the embedded URL and key. A configuration gate now throws before the shared client is constructed. Scoped `git diff --check` passed. The draft filename-only scan had zero matches for the tested JWT, private-key, GitHub, AWS, Supabase, Stripe, Slack, Google API and npm token patterns. A separate Node JSON parse found 344 resolved lockfile entries and zero outside the standard npm registry. Package scripts and the application were not run.

The full-app manifest and scanner acceptance is still pending. The draft excludes required assets and executable surfaces pending review, and static pattern checks do not establish the absence of private or operational data.

### U1.03 follow-up

The candidate now contains 1,240 files from the 2,568-path baseline manifest. The restoration added 333 locale JSON files, 412 inactive SQL reference files and 11 race engine source files without changing their bytes. Node parsed all 333 staged locale files. The hash audit verified all 1,240 included entries and unique export paths. The staged tree contains zero executable .sql files and the tested credential-format scan returned no matches. The SQL text remains unexecuted and requires review before it can serve as a complete, ordered migration set. The initial PowerShell parser rejected a case-distinct key pair in a locale, so JSON syntax validation used Node.

Of the 1,328 omitted paths, 72 are active migration files flagged by the conservative endpoint, credential, data mutation or scheduling screen. Other omissions include flagged app source, assets, runtime workers, release material and generated data. The new ExportPath column records the inert location for each included SQL file.

Offline source completeness check inspected 17 unique original worker commit pins with git cat-file. Fourteen were present and three were absent. Five direct file references rely on those absent objects. Four have same-path versions at the checkout commit with no proof of byte equivalence. The Veneto legacy replay module has no entry in the checkout or reachable local history. No missing source was fetched, substituted or executed. See BLOCKERS.md.

### U1.03 — Authorized pinned source recovery and asset completeness check

The replacement source blocker was resolved with GitHub contents GETs scoped to the three exact authorized commits and necessary relative dependency paths. Git blob SHA-1 and byte size matched GitHub metadata for all 12 files, comprising five direct imports and seven relative dependencies. The inspected closure contained no non-relative static imports and no matches for the tested credential, endpoint, client-construction or network-call patterns. The draft preserves the original bytes under reference/engine-pins and records file, Git blob SHA and SHA-256 in VERIFIED_SOURCES.json. No source was executed, no original remote was configured, and no worker entry point was activated. The remaining pinned worker integration is still task U1.06.

The source manifest includes 1,290 inherited files after targeted screening restored another 50 source and test paths. With the 12 recovered sources, all 1,302 source checksums matched. The staged-file count also matched the two manifests plus their source entries, and the credential-pattern scan passed. The application build and complete database schema remain unverified.

A four-file asset sample found production Storage references with no tracked basename match for 16 infrastructure visuals, 46 gallery assets, 77 notification assets and one login asset. Complete asset parity requires a reviewed source-only asset bundle or a decision to use local replacements. U1.03 is blocked on this decision. No Storage requests were made.

### U1.03 — Placeholder assets and local source closure

The approved image replacements are applied in the draft. ASSET_REPLACEMENT_REGISTER.md records 372 source-file/image mappings. Six PNG variants were decoded, with their inflated raster sizes checked against their headers. Distinct local URL identities preserve gallery keys and kit selection. Existing CSS sizing was retained. The original image pixel sizes cannot be established offline, so placeholder sizes follow the available layout ratios. Local artwork was retained after a metadata marker screen.

The local application draft now contains all tracked src paths. Public HTML has an offline content policy, external script tags were removed, and the inherited analytics component has no side effects. Production Storage references returned zero matches in the draft scan. The shared database client remains disabled. Two race-engine imports were localized to their exact historical Git blobs without modifying mechanics. An additional 43 dependencies were restored from the baseline or its locally available historical source, with provenance and SHA-256 recorded. The last static TypeScript parser pass read 619 JS and TS files with zero syntax diagnostics. Relative import resolution reported one missing historical race fixture. A scoped file manifest audit verified 1,449 inherited checksums, and the credential-format scan returned zero matches. The build and engine runtime were not executed.

The missing fixture contains source-data markers, named-rider fields and identifiers. It was held outside the draft. The owner-approved placeholder scope covers imagery and preserves functional race data. The needed fixture disposition and remaining verification are in BLOCKERS.md.

### U1.03 — Historical fixture disposition and snapshot acceptance

The anonymization attempt consistently remapped 220 identifiers and 232 identifying labels across three fixtures. An AST check confirmed that every numeric literal remained unchanged. The three inherited suites ran offline through cached Vitest 4.1.11. One test passed, seven exceeded the runner's five-second limit, and four failed original identity-dependent hashes. Sporting equivalence remains unverified. The three historical suites, four developer diagnostics, three fixture files, and the fixture generation utility are quarantined outside the export. Searches for the fixture names in the active source returned no matches.

Two tests in uraniusSyntheticStage.test.ts passed on an offline one-kilometre, two-team race. They exercised disabled and repeat shadow modes, replay adaptation and legacy-format classification comparison. They do not cover the historical 96-rider workload. The first synthetic attempt used one rider and one team and was rejected by the engine's existing validation; the fixture was corrected to two of each without changing the engine.

An additional 57 schema files were sanitized and retained as inactive references. The snapshot now includes 469 inactive SQL references, with 15 flagged historical seed files excluded. The full inherited manifest classified 2,568 paths, comprising 1,496 included and 1,072 excluded. All 1,563 payload hashes matched. Scans returned no tested credential or database-dump signatures, non-placeholder contact addresses, original Supabase project ref or original endpoint indicators in the applicable source and reference paths. The independent draft has no Git metadata or workflows. The draft snapshot and exclusions are recorded in SNAPSHOT_SCOPE.md and the two CSV manifests. No production requests or deployment occurred.

## U1.04 — Disable copied execution paths

Expected the independent snapshot to omit GitHub workflow, Netlify hosting and Supabase deployment entry points, cron or active migrations, and the inherited analytics script. Local path assertions passed for .git, .github, netlify, netlify.toml, supabase and public/static-analytics.js. All schema files end in .sql.txt. All 16 public HTML entry points block browser connections, frames and form submission and passed an explicit external script tag check. The client configuration gate is called before Supabase client construction, has no environment fallback, and throws in every configuration. The package exposes only dev, build and i18n scripts. The audited dev server configuration binds to loopback. GitHub destination Actions were independently verified disabled under U1.02. These checks ran locally without starting the application.

## U1.05 — Inventory environment dependencies

ENVIRONMENT_INVENTORY.csv records 633 category/file pairs with a disposition, covering authentication, database and RPC clients, deployment, schedules, required environment variables, outbound calls, worker pins, Storage and telemetry. The inventory was generated with filename-only searches over the pinned tree, and the disposition field was checked for every row. The active application, scripts and static public pages had no matches for the targeted original-service, raw GitHub, payment, analytics or mail endpoints. The package lock uses the standard npm registry for its resolved distributions. Source reference directories remain inactive. Distinct original engine pins and their transitive dependencies are handled in U1.06.

## U1.06 — Isolate pinned engine dependencies

Resolved 45 direct pinned source references and their transitive import graph into 125 source files across 18 exact commits. Recorded source Git blob IDs and original and staged SHA-256 values in PINNED_ENGINE_MANIFEST.json. One pinned module required an import-only rewrite to another exact local pin. All dependency edges resolve inside the staged closure. The test verified each staged SHA-256, transpiled 124 TypeScript files twice using TypeScript 5.9.3 with zero diagnostics and identical output hashes, and ran the pure pinned breakaway-recovery calculation at 20, 50, 100 and 110 km. Expected and observed outputs were 0, 4.5, 18.5 and 23. The staged closure returned no raw GitHub or Supabase endpoint matches. Original deployment entry points remain inactive.

## U1.07 — Verify Codex repository and execution context

The local preflight returned the expected Uranius working directory, HEAD and tree, and zero remotes. The authorized GitHub destination and disabled Actions setting are recorded in U1.02. No blank sandbox endpoint is accepted. A presence-only check found one ambient name matching the service-variable screen. That name was removed from the scoped execution process without reading its value, and a Node child confirmed zero restricted variable names. Scoped removal must be repeated before each later app-related command. Pure engine checks did not access the environment. The authorized workspace and the explicitly authorized GitHub read-only paths are the only project targets.

## U1.08 — Transfer project context

The four authoritative handover documents are installed at the workspace root and were copied into the local draft. All four hashes matched at copy time. The authoritative checklist still contains exactly 60 numbered task rows. Working requirements are a deterministic baseline, resumable and authoritative live commands, immutable elapsed history, private future state, precise multi-group replay, and exactly-once sandbox results. Production isolation, original source audit, and offline synthetic verification remain mandatory. The next task is U1.09, the audited Windows offline build and smoke tests.

## U1.09 — Establish offline Windows build and smoke tests

Audited the retained package scripts and build tools, then used an independent disposable build copy with production service and credential variable names removed from the process. Node 20.20.0 and npm 11.6.4 ran npm ci --offline --ignore-scripts --no-audit --no-fund from the existing cache. Expected a locked offline install with lifecycle scripts disabled, and observed 319 packages installed successfully. npm reported inherited glob deprecation. An isolated npm run build passed. The translation check verified eight languages, two strict namespaces and eight Premium source files, and Browserslist warned that its inherited data is nine months old. No updates were requested. Static build smoke checks passed for index, bundle, favicon, demo entry and placeholder assets. They also checked the browser offline policy, bundle cache stamping and absence of original app endpoints. Cached Vitest 4.1.11 reran both synthetic tests and both passed. No app server, browser session, database or Docker was required.

## U1.10 — Design sandbox infrastructure

PRODUCTION_PROTECTION.md defines separate DB and RPC, Auth, Storage, workers and schedules, private hosting, integrations and logs. The document check found six required resource rows with no approved ID, and verified an incremental infrastructure cap of zero and explicit owner approval for later costs. The hosting and DB allowlist starts empty. No resource discovery or provisioning was performed.

## U1.11 — Fail-closed guards

Added the shared local preflight for deploy, migrate and admin. It denies unknown operations, missing configuration, mismatched origin and unauthorized project or hosting identities. No operations can be authorized while the reviewed allowlist is empty. The browser client remains fail-closed before initialization. Node's built-in runner passed all three suites with a synthetic production-shaped target, missing configuration, invalid origin variants and CLI rejection. CLI exit status was one and no synthetic target values were printed. There were no service calls.

## U1.12 — Milestone verification

Verified the exact inherited checkout commit and tree and zero remotes. The final-source preflight reconciled all 1,496 included inherited hashes, all 125 pinned sources, and all 43 recovered local source hashes. It found no original project ref, tested secret or dump signatures, executable migrations, history, workflows, build output or reparse points in the source draft. Earlier task reports record the passing locked offline build, synthetic engine tests, reproducible pinned transpiles, environment inventory and three rejecting guard tests. No original resource changes, production service connections, provisioning or deployment occurred. The final release check creates and verifies a separate local root commit for review.

## Approved upload and U2.01 lifecycle source verification

Published only d7efe2edfcda15c09bc862f418ed7e3f8feaf189 from the independent checkout. The GitHub main ref returned the exact approved SHA. Final preflight matched the root and tree, passed Git integrity and three guard tests, and confirmed disabled Actions and an empty destination without webhooks, deployments, environments or Pages. Netlify access was addressed by the owner. No production calls were made.

U2.01 map in CURRENT_RACE_ENGINE.md covers scheduling, eligibility, preparation and locks, construction, worker lanes, persistence, live view and finish. Local assertions verified eight relative documentation links and seven key markers in the pinned source. Deployed behavior remains unknown and labeled separately. No worker or SQL ran.

## U2.02 — Compare engine versions

The two Vitest synthetic tests passed on the deterministic starting lane. The V4 assertion script passed after compiling the two reviewed files into a temporary ES module and running it directly in Node. The first combined Vitest invocation ran the assertions successfully but rejected the standalone V4 script because it registers no Vitest suite. Universal worker source routing and U1.06 pin evidence complete the decision matrix. CURRENT_RACE_ENGINE.md records the selected version and reusable adapters.

## U2.03 — Inventory current contracts

CONTRACTS.md records inherited units, schemas, invariants and missing deployed evidence. Verified all ten source links and five exact contract markers. No schema connection was made.

## U2.04 — Timeline and replay consumer audit

CURRENT_RACE_ENGINE.md maps source snapshots, persistence, replay adaptation, classifications, UI gap reconstruction and live gating. All five targeted assertions about event references, chronology, membership, estimated gap layout and replay availability matched. The earlier two-rider offline test exercised replay adaptation. No app or worker ran during the source audit.

## U2.05 — Versioned contracts and offline semantics

Three offline Vitest tests passed. Coverage includes unsupported version and malformed profile rejection, duplicate group membership, temporal ordering, stage identity, command ticks, event time, checkpoint digest and classification rank or status validity. No existing clock policy was changed. Deployed time mapping and owner approval for any material change are documented in ARCHITECTURE.md.

## U2.06 — Synthetic micro-fixtures

Two offline Vitest tests passed on the ten-rider, ten-kilometre profile and the separate hand-computed constant-speed group reference. The reference splits the field 2/8 at km 3, reaches km 5 and 4.5 at second 450, catches at km 6 and second 600, and finishes together at km 10 and second 1,000. All ten riders are accounted for once at every sample. The fixed reference is independent of the engine's observed output.

## U2.07 — Existing no-command baseline

Two executions of the same fictional ten-rider stage yielded identical full output, with all ten riders finished, 32 frames and 12 events. Pinned canonical output hash 98cdb350835b7fde. The regression test was then rerun against the fixed expected hash and passed. The independent arithmetic reference in U2.06 remains separate from this observed engine baseline.

## U2.08 — Single-rider terrain motion

The inherited terrain speed helper was tested at gradients zero, +5 and -5 percent, with base speed 36 km/h. Hand-computed expected speeds and observed speeds agreed at 36, 29.7 and 39.24 km/h. Thirty-second distances were 0.3, 0.2475 and 0.327 km. All three checks passed within 0.000000005 in the tested units. This verifies the isolated terrain adjustment and distance arithmetic. It does not assert that full-stage group pace follows the same isolated model.

## U2.09 — Group and energy mechanics

Nine suites passed, with 86 tests covering group motion, breakaway creation, catch and reabsorption, order effects, fatigue, drafting, energy, and replay boundary invariants. The new caught-group check verifies an 8/2 split, exact restoration of ten unique peloton riders, and no second absorption when applied again. An initial test started with a lead and was protected by the engine's fresh-launch rule. The corrected fixture starts at an equal position. The inherited one-km replay test expected a post-finish frame at 120 seconds. The same suite verifies the completed final snapshot at the actual final state; sampling stops at second 90 in this fixture. The stale 120-second expectation was removed without changing simulation code.

## U2.10 — Time gaps and timeline

Two offline Vitest checks passed. At second 450 the simultaneous distance gap is 0.5 km. At 5 km, the leader crosses at second 450 and the peloton at second 500, a measured gap of 50 seconds. The crossing helper refuses to extrapolate and rejects backwards sample positions. The synthetic timeline passed schema validation and only the split event is elapsed at second 450. This is an offline calculation and is not wired into the legacy UI.

## U2.11 — Representative synthetic fields

Initial descriptive trial established reproducibility. For the conformance run, the offline engineering limits of 20 seconds per stage and 1 MiB serialized output were recorded in ARCHITECTURE.md before rerunning. The conformance run passed six tests including the ten-rider regression, four full-field comparisons and a repeatable puncture check in a 96-rider field. All scheduled riders finished every no-command stage and final IDs exactly matched the roster.

| Scenario | Canonical hash | Run/repeat in ms | Bytes | Frames/events |
|---|---|---:|---:|---|
| Flat, 24 riders | a16eeb4aa3fd0bc6 | 937 / 1042 | 103014 | 86 / 26 |
| Hilly, 48 riders | 7ed8f7c2a7e0d7c6 | 1854 / 2202 | 180860 | 89 / 50 |
| Mountain, 96 riders | c5152197cecfe4d0 | 6520 / 4985 | 359771 | 100 / 98 |
| Flat, 96 riders | 364c8989142147b5 | 5361 / 5205 | 324675 | 86 / 98 |

Each case is a fictional 30 km road stage. The puncture test verifies deterministic incident output, correct actor, no mutation of the original group, and no lost or counted-twice riders. These scenarios replace the privacy-sensitive field-size workload. Historical sporting parity, other formats and deployed performance remain unverified.

## U2.12 — Freeze baseline and verify Milestone 2

RACE_BASELINE.md freezes the benchmark baseline commit a7491a5a59f582605d799ec23adc9f22cf8e1be5, five full-output golden hashes, measured acceptance and continuation gaps. The final offline run passed all 104 selected Vitest checks across 17 files and all three Node protection guard tests. Each full-field stage matched its canonical golden, roster and metrics. The longest stage in the final gate rerun took 5,270 ms and the largest serialized result was 359,771 bytes. The working Git check passed. Gate 2 passed. Historical race parity, non-road formats in the selected lane and deployed runtime behavior remain outside the verified baseline.

## Milestone 2 GitHub synchronization

Reviewed each of the 12 unpublished commits, including metadata and every changed file version. The audit found no new credential, contact, dump, private fixture or production endpoint signatures. Existing approved-root text remained within the prior review. Recreated only the unpublished history to remove Windows line-ending warnings and retained the original local commits under an unpublished backup ref. Both individual and aggregate Git whitespace checks passed. All 104 selected Vitest tests and three guard tests passed from the normalized checkout. GitHub confirmed cfc232015d0b3f34945d5e6d4ed5f83baceb78de on Uranius main after a normal fast-forward push. GitHub Actions remained disabled and hosting checks found no Pages, hooks, environments or deployments.

## U3.01 — Complete resumable state

Two checkpoint tests and the pinned no-command baseline passed. The checkpoint stores a versioned envelope for the existing_v1 tick engine, preserving insertion order and explicit undefined order fields. A progressed stage with a pending attack round-tripped through JSON, produced identical full states for ten further ticks, and executed the scheduled attack in each branch. Unsupported versions and a modified payload were rejected. The current tick path carries its inputs, seed, clocks, rider/group/order state, event history and counters in SimulationState. This checkpoint does not authorize a different engine lane.

## U3.02 — Checkpoint continuation

Six offline tests passed. Continuation from serialized checkpoints at ticks 0, 1, 9, 20 and 40 produced the exact uninterrupted output, including events, frames and final riders. The last checkpoint exercises an already-completed race. The frozen ten-rider hash passed again. Continuation reuses the existing tick, replay boundary, snapshot and output functions.

## U3.03 — Command contract and ordering

Seven offline checks passed. Attack requests carry unique IDs, rider and team identities, a strict payload, the observed tick and expected revision. The ordering function records the trusted owner and assigns the authoritative effective tick and next sequence. Tests cover duplicate, late, future, stale, malformed and closed commands. Authorization against the team roster is staged for the later authority task.

## U3.04 — No-command invariance

Six offline checks passed across the checkpoint and invariance suites. Empty-input continuation, a rejected backdated request and a zero-tick no-op all retained the frozen full output. Canonical timeline/output remained 98cdb350835b7fde, and final rider classifications matched the baseline hash. No engine mechanics or frozen fixtures were changed.

## U3.05 — Single live attack

Two offline checks passed. At tick 5 the accepted attack entered the existing order and tick engine, emitted ATTACK_STARTED, consumed energy and changed future group membership and replay samples. Every elapsed frame and event remained byte-equivalent. Final finish times came from the recomputed completed state. The test rider was caught and classification matched the no-command run. First-tick energy use also matched the no-command comparison in this fixture. No extra energy surcharge was introduced. The no-command golden still passed. The inherited pre-race launch places the new group ahead by an initial five-second gap. U3.06 must verify the causal boundary before the command path can advance.

## U3.06 — Future causality

Eleven offline tests passed, including the frozen no-command output and inherited attack-order regressions. The live attack starts at the rider's exact present position. Legacy pre-race orders retain their existing launch behavior. The controlled scenario verified unchanged seed and physical state at intake, an identical repeated application, unique event sequences and group membership, and nonnegative rider motion within the speed-limit distance at every tick through completion. The tested rider's group change arose during the existing movement step.

## U3.07 — Repeated live commands

Three offline tests passed. The second attack at tick 7 builds on the checkpoint advanced from the first at tick 5. Sequences are exactly 1 and 2. A stale-revision apply and a duplicate apply to the successor were rejected. Applying the same accepted command to the same predecessor reproduced one identical successor. Previously elapsed frames and events remained exact, and the continued output contains each attack exactly once.

## U3.08 — Rule discovery and regression before hold

Source inspection verified that the existing tick invokes the effect executor and that the executor ignores non-attack orders. The existing chase effort helper is limited to eligible chase groups on flat profiles and incorporates average energy. No approved rider-level chase or follow rule has been established. No U3.08 acceptance result is claimed. See BLOCKERS.md.

The pre-hold regression run passed 31 tests across nine Vitest files and all three production protection tests. The full set of five frozen output hashes remained exact, including both 96-rider road fixtures. This regression does not establish historical sporting equivalence.

## U3.08 — Chase and follow

22 offline checks passed in eight files. Flat chase reused the inherited flat-stage bonus and charged the boosted speed against unboosted effort. Tests cover increased speed and energy use, a surviving gap, and a catch only when simulated distances cross. Follow tests show a stronger rider leaving at the same position as the source group and a slower rider remaining with it. The chase pace helper is applied only on flat course profiles. On non-flat stages follow uses normal terrain-adjusted movement without a new pursuit bonus. Earlier replay frames remained exact and the frozen micro-stage hash passed.

## U3.09 — Teammate support and effort

Seven offline checks passed. Same-group teammate support activates the existing capped cooperation pace for one tick. Late-stage peloton effort uses the inherited onset and cap for one tick. Extra pace consumes additional energy through the existing speed-cost calculation. The tests reject a non-teammate target and early effort. The boosted actor does not automatically win. Prior replay output and the frozen no-command golden remained exact.

## U3.10 — Server authority harness

Three offline checks passed. The in-memory authority derives the effective tick from server state, verifies principal ownership and rider eligibility, and uses the expected revision to serialize competing requests. The same authorized request returns its original acknowledgement. A different payload or owner with that ID cannot replay it. The elapsed projection contains only current or prior frames and events, preserves already published frames, and clones output so callers cannot mutate the authority.

## U3.11 — Recovery and finalization

Four offline tests passed. A cancelled advance leaves the durable record byte-identical. After an accepted attack and simulated worker interruption, a new authority restored the published prefix and accepted revision, reproduced the uninterrupted continuation, and finalized one attack exactly once. Premature finalization returned no result. Late submission was rejected. Finalization and restoration of a finished race returned the same sealed output, and corrupt recovery data was rejected. This harness does not issue rewards or persist to a hosted service.

## U3.12 — Hybrid benchmark and milestone gate

The complete offline regression passed 133 tests across 28 files and all three protection guards. All five frozen no-command outputs matched their existing golden hashes. In 30 km flat, hilly and mountain simulations with 24, 48 and 96 riders, two managers submitted successive attacks. Every elapsed frame and event was preserved, and each repeated command sequence gave the same result and complete final roster.

| Case | Canonical hybrid hash | Max wall / CPU ms | Max acknowledgement ms | Max sampled heap growth | Result bytes |
|---|---|---:|---:|---:|---:|
| Flat 24 | 6155132e0e162517 | 289 / 375 | 5 | 6496384 | 147855 |
| Hilly 48 | a0d1f86c8087cf52 | 442 / 578 | 4 | 7945240 | 226030 |
| Mountain 96 | 2c085a4117904c3d | 1106 / 1266 | 7 | 11450128 | 410418 |

All cases met the recorded offline engineering limits. The heap figure is a sampled increase. This gate covers the in-memory authority and synthetic road stages. Historical sporting parity and deployed performance remain unverified.


## U4.01 — Isolated fixture viewer

One Vitest fixture test passed. Headless Chrome opened the local bundle at seconds 0, 300 and 600 and rendered 1, 2 and 1 groups, respectively. The fixture imports no engine runtime or database client.


## U4.02 — Course and axes

Both offline tests passed. Distance and elevation use the authoritative 10 km profile. At km 5 the marker maps to SVG x=372. Headless Chrome passed its corresponding pixel-position check at viewport widths 620 and 1280 px.


## U4.03 — Time-driven positions

Three offline tests passed. At seconds 375 and 525, interpolated group positions matched the independently calculated 4/3.75 km and 5.5/5.25 km. Exact checkpoints, group birth and stopping at the last available sample were verified.


## U4.04 — Terrain-dependent speed

Four offline tests passed. The terrain fixture contains precomputed checkpoint speeds of 36, 29.7 and 39.24 km/h. A test independently recomputed the inherited terrain speeds and matched 30-second position changes to eight decimals. The browser renderer interpolates the fixture distances without calling the engine.


## U4.05 — Separate group markers

Five offline tests passed. The split frame places both independent group markers at the same true x=242.4 and offsets their dots vertically. The chase frame places markers at x=372 and x=339.6, and the catch removes the absorbed marker. Names and counts are associated with stable group IDs on the adjoining list.


## U4.06 — Measured time gaps

Six offline tests passed. At second 450, separation was 0.5 km and the time gap at the trailing group location was 37.5 seconds. The leader had slowed by that checkpoint, so using its current speed to infer the gap would be incorrect. A location before the leader first appeared produces an unavailable time gap.


## U4.07 — Group formation and split

Seven offline tests passed. The split event remains hidden until its recorded second 300. A stable peloton ID retains eight riders while two known identities move to the breakaway, and duplicate membership is rejected. SVG nodes retain identity for continuing groups.


## U4.08 — Merge, finish and withdrawal

Eight offline tests passed. After the catch only the authoritative peloton remains. The separate fixture retains a solo rider as an active group and distinguishes nine finishers and one withdrawal at the end, with no obsolete markers or duplicated riders.


## U4.09 — Responsive local playback controls

Nine offline tests passed. The clock tests verify pause, scaling, clamping and live boundary behavior. The fixture viewer uses animation frames and native keyboard-accessible seek and speed controls. These controls are local presentation controls and never advance simulation state.


## U4.10 — Versioned hybrid timeline

Twelve tests passed. The local loopback demo served the real in-memory authority. A live attack advanced revision zero to one, preserved the entire elapsed frame prefix, and emitted a recorded attack. Stale responses, changed history and future outcomes were rejected. Live state contains authoritative status information only for elapsed frames.


## U4.11 — Live tactics and resync

13 offline checks passed in 12 files. Two real Chrome tabs against one loopback server converged to revision 1 after an attack. The browser showed accepted and rejected responses, manual reconnect restored the authoritative view, and the service denied an unowned rider and a cross-origin clock request. The initially throttled background tab now snaps to elapsed data instead of waiting on animation frames.


## U4.12 — Visual regression gate

The full offline run passed 144 checks across 39 files and all three protection guards. All five frozen no-command hashes and three hybrid benchmark hashes matched. The final 11 viewer checks passed again after visual refinements. The Chrome evidence suite verified two tabs, acceptance and rejection, resync, elapsed history, completion, 16x playback, pause and seek, and a race clock unaffected by replay controls. Six synthetic captures are in demo/race-replay/evidence. Plots were assessed at desktop and narrow widths; no production service or deployment was used.

## Milestone 4 follow-up — Matched live attack acceptance

This is additional evidence for the existing Gate 4, with the checklist unchanged at 48/60. Race A used the deterministic runner with no live command. Race B used the existing live authority with exactly the same synthetic ten-rider input, course, attributes and seed. The authority accepted an attack at tick 5, or second 150. Every already-published frame and event matched Race A byte for byte through the command boundary. The comparison labels an attempt successful after a measured lead of at least 100 m for three consecutive recorded samples. This threshold affects presentation only.

| Scenario | First outcome | Maximum separation | Race A rank / time / energy used | Race B rank / time / energy used |
|---|---|---|---|---|
| Fictional Rider 10 | Successful at 270 s | 1.724768 km | 1 / 1020 s / 2.619366 points | 1 / 870 s / 2.248578 points |
| Fictional Rider 1 | Unsuccessful at 180 s | 0 km at recorded samples | 10 / 1020 s / 3.235494 points | 10 / 1020 s / 3.235494 points |

The strong rider finished 150 s earlier and used fewer total energy points in this simulation. There was no separate attack surcharge added for this demonstration. The weaker rider launched according to the event log and was back in the peloton at the first checkpoint after launch. Each baseline had 12 events. Each attacked run had 16, including the authoritative order and launch events. The browser compares every rider's rank, time and energy, and both event streams.

The combined regression run passed 146 tests across 40 files and all three protection guards. All five frozen no-command hashes and the three hybrid benchmark hashes remained unchanged. Headless Chrome verified the replay navigation, executing/successful/unsuccessful labels, two visibly separated markers only in Race B, and all ten comparison rows. Three synthetic captures are in demo/race-replay/evidence. No simulation mechanics changed.

## U5.01 ? Offline infrastructure preparation

Prepared INFRASTRUCTURE_PLAN.md on sanitized baseline 246a975597ef9fcf189eaea008939800dd20cf96. Supabase public documentation lists Pro at $25/month before tax with one Micro covered by the $10 monthly compute credit. Expected Micro capacity is provisional pending integrated load testing. No project, site or migration was created.

- Inventory expected metadata only with valid path and line pointers. Observed 4,804 rows across 419 of 469 scanned inert SQL references and 834 literal call sites across 126 source files. All pointers passed bounds checks. The catalog is lexical and needs dependency and privilege reconciliation in U5.02.
- Sandbox gate expected to reject missing and unapproved identities. Observed 3/3 Node guard tests pass. The allowlist remains empty.
- Local replay comparison and timeline suite passed 13/13 in 12 files.
- Expanded race-engine selection returned 235/236 in 37 files. The retained multi-group adapter test expects snapshots at 0, 30, 60, 90 and 120 seconds, while the observed output stops at 90. This preparation changes no source or tests.
- Unfiltered Vitest discovery exited 1 with 37 failed files and 19 failed tests. It includes Node test files requiring their own runner, legacy checks for withheld production worker files and existing simulation assertions. Treat these results as baseline triage for scoped integration verification. Keep production-connected workers quarantined.
- Checklist retains 60 tasks and 48 verified passes. The U5.01 provisioning gate remains blocked pending explicit cost approval and independent configuration and access verification.

## U5.01 - Existing Pro organization revision

The revised plan targets one standalone Micro in the existing Pro organization. At $0.01344/hour, 730 hours costs $9.81 before unused credit, tax and shared-quota overages. Owner-side billing confirmation is pending. No provisioning, database connection or migration was performed.

- Target guards passed 5/5 with Node. Verified that a missing or unapproved project fails closed, direct SQL requires the exact project host and role, IPv4 session pooling requires both the pinned host and project-qualified role, and modified TLS, database, port and query options are denied. Deploy is disabled. The approval pin stays empty.
- The synthetic adapter fixture finishes at 90 seconds. The corrected assertion checks the 0, 30, 60 and 90 second source snapshots and verifies the adapter maps every frame number, timestamp and distance. Engine and adapter implementation stayed unchanged.
- Explicit offline race-engine and replay selection passed 249/249 across 49 files, including the frozen no-command and hybrid checks.
- Full Vitest discovery rerun returned 1,124 passed and 18 failed tests across 117 files (81 passed, 36 failed). Before this revision it returned 1,123 passed and 19 failed. The adapter failure cleared. Remaining failures include legacy simulation assertions, production worker/source expectations and test files requiring separate discovery or runners. No pass is claimed for the repository-wide suite.
- U5.01 remains blocked and 48/60 tasks remain verified.

## U5.01 - Final offline preparation and baseline triage

Ran the same local Vitest version/configuration against this checkout and a clean archive of the sanitized root `d7efe2edfcda15c09bc862f418ed7e3f8feaf189`. Neither run used the inherited checkout or accessed a database. Current Vitest reported **1,124 passed, 18 failed** and 81/117 passing files. The sanitized root reported **1,063 passed, 20 failed**. Every current failed assertion reproduces at the sanitized root. Its two additional failures were stale 120-second assertions in the stage and adapter tests, already corrected in `e33feda` and `cc9e7ef`. No sporting rules changed.

| Suite | Failed assertion | Classification and observed evidence |
|---|---|---|
| dnfDnsIncidencePilot | Extreme fatigue incident incidence | Inherited. Expected positive count, observed zero |
| roadRaceDirectorRuntimeV2 | Established break survives a tick | Inherited. Observed 133.2926 versus bound of 18 |
| roadRaceDirectorRuntimeV2 | Coordinated chase overrides early-catch protection | Inherited. Observed gap 115.43125 versus 0.3 |
| roadRaceDirectorRuntimeV2 | Hilly survivor count remains an audit expectation | Inherited. Observed 20 versus below 20 |
| runRaceEngine | Attack launch has extra energy cost | Inherited. Observed 16.101308 versus 13.479514 |
| runRaceEngine | Single backend calculation, never replay-page calculation | Missing test dependency. Quarantined worker file |
| runRaceEngine | Final checkpoint is the only result-visibility gate | Inherited. Legacy JSX source string differs |
| runRaceEngine | Backend ownership, sync rejection and playback speeds | Missing test dependency. Quarantined worker file |
| runRaceEngine | One engine run and downloadable audit | Inherited. Legacy audit heading absent |
| runRaceEngine | Phase 4 bridge stays in canonical corridor | Inherited. Distance differs by 0.0551109 km |
| runRaceEngine | Single backend call receives canonical Phase 9 inputs | Missing test dependency. Quarantined worker file |
| runRaceEngine | Phase 9 inputs stay backend-only | Missing test dependency. Quarantined worker file |
| runRaceEngine | Autonomous incident groups become one chase group | Inherited. Expected positive count, observed zero |
| runRaceEngine | Sprint-zone timing and finish position without injury | Inherited. Expected false, observed true |
| runRaceEngine | Phase 9/10 calculation ownership | Missing test dependency. Quarantined worker file |
| runRaceEngine | Phase 11B worker-only execution and read-only replay | Missing test dependency. Quarantined worker file |
| runRaceEngine | Protect-leader helpers collect classification leader | Inherited. Observed zero helpers versus five |
| runRaceEngine | Steep-climb protect-leader attempt can fail physically | Inherited. Observed zero helpers versus five |

All six missing dependency checks expect `supabase/functions/universal-race-stage-runner/index.ts`. Preserve quarantine. Verify equivalent behavior with a sandbox worker after integration. The other 12 failures are baseline differences. No Uranius-introduced regression was identified in this set. Review applicable current product expectations before touching simulator logic.

Unfiltered Vitest also discovers standalone diagnostics and Node test files as empty suites. Ran tracked `.test.mjs` files separately with Node's native runner. Current checkout reported **25 passed / 15 failed** versus **23 passed / 15 failed** at the sanitized root. Failures concern withheld legacy artifacts and legacy application expectations. Both test scopes remain red overall. Running the Node files with their native runner addresses test discovery without hiding the legacy failures. The explicit Uranius race and replay selection previously passed 249/249.

PGlite 0.3.16 installed from the offline cache with lifecycle scripts disabled. Rehearsed all four ordered migrations in process with a minimal managed Auth shim. Manifest hashes, ledger order, wrong or missing identity denial, route endpoints, fields of 100/150/200, anonymous denial, two distinct owners, cross-team isolation and client write/private-table denial all passed. This verifies PostgreSQL behavior of the preparation tranche locally. Managed Supabase behavior and app integration still require the later gates. Target guard passed 5/5. The initialization command denied missing configuration before invoking any database client. No remote SQL or provisioned resources were used.

## U5.01 - Hosted verification and U5.02 preparation

The exact-project metadata GET confirmed Project Uranius (sdtsivgtcaoaeoihcwzd), eu-central-1, ACTIVE_HEALTHY, and PostgreSQL 17, Supabase build 17.12.0.000. Scoped table/migration reads returned zero application tables in the three checked schemas and zero tracked migrations. The owner reported provisioning and confirmed the $10/month base. No SQL writes or access to any other project were performed.

The guard now pins the verified ref and API origin and rejects all other projects. The direct SQL target requires the exact project hostname, database, TLS mode and operation-specific role. No pooler is pinned. Six guard tests passed. The initializer refused to start without an explicit application argument before any client invocation. It also checks the server major, migration login and fresh schemas before DDL.

Two PGlite rehearsals passed on PostgreSQL 17.5, matching the hosted major. They covered the manifest-ordered synthetic tranche, role and dirty-schema preflight, identity, ledger and RLS. PGlite's template database did not support the CREATE grant needed to rehearse as the migration login. The SQL tranche was applied under the local fixture database owner and the migration-login preflight was tested independently. The exact managed build and grants still need the approved remote rehearsal. No simulator or gameplay files changed.

## U5.02 - Controlled initialization preflight

Confirmed the exact ref, direct host, ACTIVE_HEALTHY status, PostgreSQL 17 and zero checked tables or tracked migrations. Six protection guard tests and both offline PostgreSQL rehearsals passed, including exact matches for all four manifest hashes. The approved minimum-privilege role SQL was reviewed and tested in the offline database. The local secure connection prerequisites were absent. No remote role creation or migration was attempted, so there is no hosted migration ledger or post-write catalog to verify.

## U5.02 - Windows connection setup

EDB PostgreSQL 17.12 extraction succeeded. The installer matched the WinGet SHA-256 and passed the EnterpriseDB Authenticode check. The portable client is outside Git. PowerShell parsing, six sandbox guards and both offline PostgreSQL rehearsals passed. The rehearsal also ran the new verification SQL against the synthetic catalog and compared the four manifest hashes, counts and privilege checks.

The pinned Uranius host accepted a direct IPv6 TCP connection. A passwordless psql probe used only the downloaded CA and verify-full with GSS disabled and password file lookup disabled. It reached PostgreSQL's password challenge, establishing certificate and hostname verification. Authenticated database identity, the migration-role bootstrap, remote migration application and hosted verification are pending private terminal credential entry. No role or migration writes occurred.

### U5.02 - Windows PowerShell 5.1 manifest regression

Reproduced the failure without network access. Windows PowerShell 5.1 returned one outer element containing a four-entry array when the ConvertFrom-Json pipeline was wrapped in @(). The script now assigns the parser result directly and validates its array type, count, order and file hashes before client setup. The offline manifest test passed on Windows PowerShell 5.1 for all four entries and SHA-256 hashes. Six sandbox guard tests and two local PostgreSQL rehearsals passed. The approved manifest and numbered SQL files have no diff. No remote database connection or write was attempted.

### U5.02 - Windows private password prompts

The reported stall occurred during a psql invocation that combined -W login prompting and the interactive password command under PowerShell 5.1. The exact console failure was not reproduced. Replaced both native prompts with labeled, masked PowerShell input and a separate read-only login/TLS/fresh-state check before bootstrap. The revised psql child has no prompts, receives SQL over stdin and the login password through its process environment. A confirmed distinct migration password is converted to SCRAM client-side. Child errors are sanitized and bounded by timeouts. The guarded initializer now has a process timeout too.

Offline PowerShell 5.1 tests passed for SCRAM derivation against an independent implementation, salt freshness, child-environment isolation, no credential arguments, sanitized failures and forced timeout. The manifest regression, six sandbox guards and both PostgreSQL rehearsals also passed. The manifest and four approved SQL files did not change. No database connection, role creation or migration was attempted. The owner reports the hosted database is still fresh.

## U5.02 - Managed Auth permission diagnosis and resume rehearsal

Native disposable PostgreSQL 17.12 with a restricted migration login reproduced SQLSTATE 42501 for old 002 at team_owners REFERENCES auth.users(id). With just that FK removed, old 003 failed at the first auth.uid() policy on the same schema privilege. Both transactions rolled back. Native PostgreSQL then applied all four revised manifest entries and ledger writes as the restricted login without managed Auth permissions. Read-only ledger, synthetic counts, RLS checks and sample authenticated team scope passed. The local fixture server was stopped. The original hosted statement failure was not captured.

The revised manifest SHA-256 is ea319037da44cfeb255e2555043997faa841156ec95c9d54fedc4974b7c39f28. Only numbered migrations 002 and 003 changed. PowerShell manifest/batch tests, six target guards and both PGlite suites passed. PGlite checks included malformed, missing and user-metadata-only claim denial, two distinct owner scopes and client mutation denial. No hosted role, grants, migrations or data were changed.

## U5.02 - Windows PostgreSQL transport repair

A Windows PowerShell 5.1 fixture delayed reading stdin for seven seconds. The old StreamWriter.WriteAsync(...).Wait(5000) timed out after 5,014 ms when the input exceeded the pipe buffer. psql can wait for connection and authentication before reading stdin, so the old input deadline could fail before the configured connection timeout. The exact timing of the reported hosted incident was not independently observed.

PowerShell now passes its bounded batch to the local Node runner through the child environment. The runner supervises psql noninteractively with one deadline for process and pipe I/O, and reports sanitized connection, authentication, SQL and process failures. The numbered initializer uses the same runner. The resume path performs SELECT 1 in a separate read-only transaction before the fresh-state preflight. Exact host, project identity and verify-full remain enforced. The owner reports an existing restricted role and an empty application catalog. No hosted connection or write was attempted.

PowerShell 5.1 regression passed delayed startup, all 16,000 input characters, forced timeout with verified child exit, and sanitized errors including SQLSTATE 28P01 and 42501. A native local psql 17.12 read-only SELECT 1 also passed. All four manifest hashes, six guard tests and two offline PostgreSQL rehearsals passed. The four numbered files and manifest had no diff.

## U5.02 - Hosted foundation verification and U5.03 offline preparation

Scoped read-only queries confirmed stored project identity sdtsivgtcaoaeoihcwzd and the four ledger hashes below. The same hashes were verified against the local manifest and numbered files.

| Migration | Applied SHA-256 |
|---|---|
| 001_identity.sql | 87755f1d12a0b983d016e039d4ceb22aea1e5c165b65c2e6888049805fefbadd |
| 002_reference_schema.sql | 6cad841d012117a02daf7e89555cc870da5f9a5f90b4e4c8b7dfee52b84ed45f |
| 003_access.sql | b42c96b647afd9b62573c75cd922b4f8de3eff9e39c5b1c8dd2ccd2f40afe8ee |
| 004_synthetic_reference.sql | e788bf6cab85f12adce0a9227534cca57e318b15aaa69474ef2e5a950472b317 |

Observed 20 teams, 200 riders, two equipment rows, one season, 17 terrain points and 100/150/200 starters on 120/160/200 km routes. All 28 catalog constraints were validated, including six FKs. Seven orphan checks and rider-range checks returned zero. The eight catalog tables have RLS and one SELECT policy each. The two private tables denied direct client ACL checks. Zero Auth users and zero ownership rows. No application triggers, cron extension, network extension, buckets or application publication tables. Confirmation covers database-visible state. No dashboard configuration was changed.

See reference/DB_DRIFT_AUDIT.md for the full reference index and remaining requirements. The offline synthetic world smoke test loaded the reviewed SQL and advanced all three canonical inputs through 90 seconds using the existing hybrid engine. Catalog memberships, route endpoints and unrevealed final results passed. Hosted game login, full reconstruction and the remaining U5.03 imports are still pending. No remote writes were performed during verification.
