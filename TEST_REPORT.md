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
