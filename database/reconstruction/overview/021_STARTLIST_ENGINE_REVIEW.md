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


## Owner native run and corrected two-team fixture — 2026-11-25

Owner pulled `8ee3bd2`: 57 historical + 6 seed checks and first 5 new 021 checks passed (68 positive checks before failure). Candidate created exactly 10 correctly owned startlist rows, rejected foreign riders/duplicate captain/slot/missing preparation, and preserved privacy/finance/clock. Scratch PGDATA cleaned up. Engine execution failed with `TEAMS: at least two teams must exist.` This is a test fixture defect, not a failure of the validated engine or 021 DDL.

Corrected adapter (`fed68ef`) now requires two distinct clubs with five riders and one captain each, ten unique UUIDs, exact roles and bounded catalog scores. Corrected native harness (`2c46a9a`) temporarily adds Club B's accepted entry/preparation to Club A's 120 km flat classic, copies B's five already selected DB riders to that same race, reads both rosters inside the transaction and ROLLBACKs the temporary entry/preparation/startlist before invoking the existing_v1 engine. Verifies original 3/4/2/2 counts, 10 startlist rows and policies unchanged after rollback. Expected ten finishers, ranks 1–10, deterministic repeated output, six invalid inputs rejected, two teams. The final duplicate gate was not reached in the first run. No change to 021 SQL (Git blob 634724160f97cd08584f5f44fd170751a7f59c8c) or engine source. No hosted opponent, startlist, skill, finance or clock change.

Rerun the same documented command after git pull; corrected runtime not yet verified. Because the previous scratch database was removed, prerequisite replay occurs in the same command; do not run separate historical suites. No hosted installation authorized. 49/60 unchanged.
