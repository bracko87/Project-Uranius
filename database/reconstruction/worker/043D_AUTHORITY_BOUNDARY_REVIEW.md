# 043D — independent authority and role boundary rehearsal (local only)

2026-11-26. 043C both slices native 14/14 accepted; exact private policy and integrated two-stage PostgreSQL 7/7 passed. No production or isolated hosted access, credentials, migrations, official results, finance, resources, worker/scheduler or clock changes. Existing accepted fixtures unchanged.

## Design decision
The current isolated worker has narrow completed-job writes (025/027); the two existing job kinds `verified_repeat` and `calendar_review` are review-only and must never become publication authority. A completed job or synthetic packet cannot grant itself authority. The 043D disposable schema separates a trusted source owner, independent evidence verifier and separate admission role; the existing worker and client stand-ins receive neither capability. This is a local boundary rehearsal, not an actual hosted role/schema definition or source of sporting authority.

- `043D_authority_boundary_native_REVIEW_ONLY.sql` (f4925ef4d8cf3d7a68e5372f9a283a95e769af43, UTC fingerprint correction 724a9db4c38a70ed6b33cf2116930a4cb786b6c8): 5 NOLOGIN/NOINHERIT roles, trusted fixture source and expected evidence tables, 10 exact kind/digest attestations (roster, markers, workload, resources, health, penalties, youth, policy, recovery, lifecycle), restricted SECURITY DEFINER functions with fixed search path and UTC rendering, no direct actor reads/writes, separate grant for each function. Reject existing review job kinds, nonterminal/leased jobs, mismatched raw text hashes/identity, early reveal, missing evidence, wrong stage order or changed prior evidence/source. Race-level transaction lock, exact immutable retry, one local receipt per stage. Receipt CHECK constraints hard-code false official, hosted write and accounting flags. No official result/finance/inventory/game schema, no actual worker transition.
- Local `authority_rehearsal` source rows and evidence digests are explicitly seeded synthetic stand-ins by a trusted disposable admin. Digests attest expected identities, not the semantic truth of evidence or a real authority producer. No actor can register its own source or expected digest. The guard owner and superuser remain trusted; no protection claim against arbitrary administrator DML. Future actual authority must use separately verified server-owned sources and exact official writer contract, never this schema.
- `tests/uraniusAuthorityBoundaryNativePg17.mjs` (bdaa660aae4e8c13195a9f623dfcf73fa8fd9d27): seven groups for role grants/denials, blocked review job kinds, evidence mismatch/coverage, digest/reveal/prior gates, rollback and concurrent receipt exactly once, prior evidence tampering and timezone-independent retries, hard false flags/no writer. Re-fetched exact committed JS and syntax parsed using AsyncFunction after stripping imports and substituting import.meta.url; PASS. No native SQL execution here (no PG17 server/client binaries in available container). Native checks pending.

Run from existing isolated review clone; no private policy snapshot or credentials needed:
```bat
git pull origin main
node tests\uraniusAuthorityBoundaryNativePg17.mjs --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```
Expected 7/7 and disposable cluster cleanup. Only local loopback and stripped environment.

## Remaining activation gates
Original marker definitions, authoritative engine/readiness/effects, health catalogue, canonical resource/health persistence writers and source of recovery/penalty/youth evidence remain outstanding. General withdrawal scoring/shared owner handling also not covered by 043C. No production metadata inspection authorization inferred. Next after native 043D acceptance: reconcile actual source/writer contracts and prepare isolated-only design with real source binding and no synthetic promotion, before any separately approved pinned migration. Overall 49/60, U5.04/U5.09 IN_PROGRESS, hosted activation BLOCKED.

## Native first attempt — syntax correction

Owner pulled a56c9c9; native PG17 rejected SQL at line 43 before checks ran because both opening function delimiters were reduced to a single dollar sign during the UTC correction. Disposable cluster cleanup confirmed. Fixed both delimiters in 02ead9350d9c6eaa4bfc8c74e04180b06ddb5eb5 and re-fetched exact committed SQL to verify two matching opening/closing dollar-quote pairs. No change to authority logic, roles or scope. Native rerun still required; no checks accepted from failed attempt.
