# U5.03/U5.04 — synthetic startlist and database-to-engine review (2026-11-25)

019 is installed and both managers' populated Calendar data display accepted. **021 is review-only and NOT approved or applied to hosted Uranius.**

The existing 019 races have two separate accepted entries (A flat classic and B mountain tour). Neither has an operational rider startlist. Existing 018 has six unavailable original skill values; preserve NULL. No original rider/route data imported.

## Implemented
- 021_synthetic_startlists_REVIEW_ONLY.sql: exact 15-ledger history, pinned isolated TLS/migrator/PG17/paused-clock preflight, private startlist table; five riders per existing accepted entry, deterministic catalog ordering, first captain and four domestiques. FK links enforce preparation and same-team catalog ownership, existing UUID mapping, unique race/rider and selection slot. No new entry or AI opponents added. Temporary SELECT policies on two existing FORCE RLS relations removed atomically; new table FORCE RLS with zero reader/public policies/grants. Existing preparation rider_count and finance remain unchanged intentionally until real lifecycle submission is implemented.
- scripts/uranius-startlist-engine-review.ts: first actual disposable DB roster-to-engine path for the existing 120 km Club A flat stage. UUIDs and four catalog scores come from SQL; synthetic flat elevation points and six explicitly test-only engine ability defaults of 75. Not real profile geometry or original rider attributes; synthetic catalog stamina is separate from original endurance. No hosted or worker connections, no mutation or result persistence; uses unchanged existing_v1, repeats same input and checks exact output digest, five distinct finishers/ranks, invalid packet rejection and input immutability. Single-club race only, not yet sporting competition.
- Existing full-history native PG17 runner gains optional --startlist-engine-review flag; replays the exact predecessor migrations only in new scratch PGDATA, runs seven new startlist/engine gates including role/TLS, rollback, membership/constraints, access denial and duplicate rejection, feeds actual disposable SQL JSON to esbuild-bundled engine, removes scratch database. Other invocation paths unchanged.

## One verification command
```bat
git pull origin main
node tests\uraniusRider018FullHistoryNativePg17.mjs --startlist-engine-review --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Expected seven new checks plus prerequisite replay. Native SQL and engine execution NOT yet run. Candidate is not a complete operational startlist system; no hosted installation until new native gate, exact digest freeze and separate explicit approval. Next: persisted validated race input and real competing-team roster, owner-scoped startlist read/submission, race run/result persistence, checkpoint/command integration. No production changes, no additional infrastructure cost. 49/60 unchanged.
