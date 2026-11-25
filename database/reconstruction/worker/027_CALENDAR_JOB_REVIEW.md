# U5.04/U5.06/U5.08 — new calendar jobs (027, REVIEW ONLY)

026 is closed. Hosted read-only inventory and actual 027 snapshot query confirm 19 ledger entries and paused S1D1 (2000-01-01); Opening Race 0 accepted/prepared teams and 0 riders; Flat Classic 2/2 teams, 10 riders, completed queue and archive; Mountain Tour stage 1 Jan 3 hilly and stage 2 Jan 4 mountain each 1/1 team, 5 riders, no job/archive. No hosted changes. Original clock has CHECK(is_paused) and cannot advance; live scheduling remains blocked by reconstruction, not simply an activation switch.

Implemented:
- 027_calendar_snapshot_REVIEW_ONLY.sql: real calendar/accepted/submitted zero-cost preparation/startlist/catalog source read; no new grant or manager API. Actual read-only aggregate verified on hosted data. Later guarded migration must use narrow temporary SELECT policies for owner and compare exact transaction snapshot.
- scripts/uranius-calendar-dispatch.mjs: pure date/paused/duplicate/status/preparation/carryover gate, canonical StageInput from exactly two accepted complete five-rider rosters. Explicit preview date never authorizes dispatch. Stable seed, synthetic elevation samples and existing six skill defaults 75 are test-only, not actual terrain/skills; Stage 2 is deliberately blocked until carryover exists.
- 027_calendar_job_contract_REVIEW_ONLY.sql: extends private 025 queue with immutable calendar identity, unique calendar stage, nullable expected output only for calendar_review jobs, strict digest check, input/output identity trigger; original verified_repeat keeps expected digest constraint and terminal immutability. No new role, grants, scheduler or official effects.
- scripts/uranius-calendar-job-worker.mjs: reuses old atomic claim/fencing/recovery, supports verified repeat unchanged and newly generated jobs by two independent pure executions, validating identity/roster and byte equality before single completion. Trusted worker, not an adversarial proof of engine execution. No live commands or official classification publication.
- tests/uraniusCalendarJobNativePg17.mjs: seven focused disposable native checks, including preserved completed legacy job, new hilly simulation without preknown result, no duplicate completion and mismatched repeat denial. New native harness not executed yet; 025/026 evidence retained.

Next run:
```bat
git pull origin main
node tests\uraniusCalendarJobNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Expected 7/7 and scratch cleanup. No credentials. After pass, freeze guarded 027 upgrade and one controlled Mountain Tour stage 1 preview job. Explicit separate approval needed to add Club A opponent (one accepted entry, submitted zero-cost preparation and five existing owned synthetic riders) to Club B Mountain Tour, enqueue one novel job under paused-clock test override, and then execute with temporary worker login. No Stage 2 until fatigue/GC carryover, no clock advance or scheduled service. Actual enqueue wrapper, owner-local hosted migration/upgrade and full game-calendar dispatcher are not yet implemented; no paid services or original production access. Overall 49/60 tasks.


## 2026-11-25 — owner native acceptance 7/7 PASS

Owner pulled 4f846f8 and ran the focused native PG17 harness. All seven checks passed: paused/future/preview gates; eligibility, duplicates, roster and stage carryover; canonical new hilly input without expected digest; atomic upgrade/rollback preserving completed legacy job; private access and unique calendar stage; actual restricted worker runs new race twice and stores one exact output; divergent output denied and terminal legacy preserved. Scratch cleanup successful, no hosted connection. Standalone candidate accepted; hosted upgrade and enqueue not yet executed. Do not repeat prior tests.


## Frozen hosted upgrade and enqueue — separate approval required

Fresh read-only baseline: 19 exact ledger pairs, one byte-verified completed job, 3 entries, 3 preparations, 15 selections, paused S1D1, dormant worker, no scheduler, 2 job policies, no startlist policies, new columns absent. Frozen manifest SHA-256 205474b99194461085a9b4d3b4df174a71e790310d727ddddc7ccdef38aa8794; candidate SQL SHA-256 34084f249e1546815cf4674921968ed4485f05258c740ee74a3a451d0de274cc. Eleven files pinned, native-tested SQL embedded unchanged. Guard compiled to expected assert_project permission denial in read-only connector; no mutation. Local direct TLS migrator runner stages one Club A opponent entry, submitted zero-cost preparation, five existing owned selections from Flat Classic, upgrades private job schema, reads calendar in a rolled-back transaction, generates canonical novel hilly input using Jan 3 explicit preview, checks exact snapshot equality during full rollback rehearsal and atomic commit, enqueues exactly one job with no expected result, removes all temporary policies, records ledger 20. Existing completed job remains immutable; no Stage 2 job, clock advance, login activation, scheduler, official results, finance or production changes. New wrapper source reviewed but not runtime-tested. After explicit approval run scripts/run-approved-calendar-027-windows.ps1 with exact manifest, existing CA, PG17 binaries and private migrator password. Independent postflight required before worker execution. No previous tests need repeating.
