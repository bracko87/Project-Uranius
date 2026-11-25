# U5.04 / U5.06 — private queued race worker (025, REVIEW ONLY)

## Purpose and verified hosted prerequisites

Operation 023 and Migration 024 are closed; owner accepted actual hosted replay display. Independent read-only hosted inventory: 18 migration records, one completed archive, one sanitized preview, paused clock. Only uranius_migrator and uranius_smoke_reader exist; neither has CREATEROLE or BYPASSRLS. No uranius_worker or uranius_scheduler login exists. Deployment guard explicitly prohibits remote deployment. Club A Flat Classic is the only current two-team competitive fixture; mountain tour has one team, opening race zero. No hosted writes or role creation performed.

## Implemented

- 025_race_job_contract_REVIEW_ONLY.sql: isolated uranius_jobs schema, immutable input + digest, unique stage/input, due time, status, attempt cap 3, lease token and expiry, terminal result/digest, narrow worker column updates, FORCE RLS, transition trigger with legal-state validation, no application access and no worker INSERT/DELETE. This is a standalone contract component, NOT an authorized hosted migration; a later guarded package must add exact ledger, archive identity and stage FK verification, seed one explicitly approved job, and restore temporary seed policies.
- scripts/uranius-race-job-worker.mjs: atomic SKIP LOCKED claim, token fencing for stale clients, expiry reclaim, exhausted-attempt handling, bounded lease, input digest/stage check, exact expected output digest and conditional atomic completion. Worker is a trusted dedicated server role, not a manager API; lease tokens fence cooperative processes, not malicious clients sharing the worker credential. No heartbeat yet; default 180-second lease and pure child must finish within 120 seconds. No result/finance/clock writes.
- scripts/uranius-race-job-engine.ts: pure existing_v1 engine, validated no-command StageInput, no network or DB; exact serialized output. Existing engine untouched. This first job contract deliberately requires an independently known output hash, so it proves repeatability/recovery of a previously verified no-command race, not arbitrary new races or official finalization.
- tests/uraniusRaceJobWorkerNativePg17.mjs: new small independent disposable PostgreSQL 17, actual separate non-superuser worker login, two simultaneous claims, expiry/recovery, stale lease denial, duplicate job/result, crash retry cap, future due time and ACL/transition denials. Engine uses existing validated synthetic adapter as reference. No need to reconstruct all earlier 18 migrations for this focused contract test; later full hosted candidate requires upgrade-path verification.

## One next owner-local test

```bat
git pull origin main
node tests\uraniusRaceJobWorkerNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Expected 8/8 targeted checks and disposable PGDATA cleanup. No password or network connection needed; tests not executed in assistant environment (no native PG binaries or repo checkout). After success prepare role provisioning under separately approved admin boundary, guarded migration with exact 18 predecessors and one approved immutable input copied from existing archive, direct TLS worker runner, bounded loop/restart and independent readback. Only then enable one test job; separate schedule and game-clock enablement remains off. No paid worker/service or production action. Overall 49/60 unchanged, U5.04/U5.05/U5.06 IN_PROGRESS.
