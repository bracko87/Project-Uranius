# U5.05 / U5.07 — participant-only race results and recorded replay (024 review)

Operation 023 closed; one verified hosted archive ff57a18f-9eca-4c65-9692-5d9bec28b101, 120 km, two teams, ten finishers, 347 frames, 12 events. 024 is a new REVIEW ONLY candidate, not authorized/applied. Independent READ ONLY projection query against actual archive returned 64,052-byte derived JSON, ten classifications, 347 frames, 12 events, initial 0 km/0 s and final 120 km/10380 s, one recorded peloton. Corrected-style full migration DO compiled on actual PostgreSQL and reached expected assert_project permission refusal with connector; no writes.

The migration pins all 17 ledger hashes plus exact immutable hosted archive ID and input/output SHA. It copies only classification names/teams/rank/time, frame time/distance, group type/position/speed/gap/count/active and event sequence/time/km/type into a single derived game-schema preview row. No raw rider attributes, energy, tactical orders, rider UUID membership or event payloads. Raw archive remains private, FORCE RLS and no reader grants. Temporary archive select policy removed atomically, new preview table FORCE RLS with narrow SELECT(race_id,packet) to existing smoke_reader only, RLS requires an accepted race entry for server-verified owner club. No anon/authenticated grants or write grants. It deliberately publishes a static synthetic review only, not official results or live data.

Added authenticated GET /fixture/race-replay, strict bounded projection validation, separate default-OFF reader switch, and new local HTTPS React results/replay page with recorded group track, elapsed race time, frame slider, play/pause, step/restart, speed and event log/classification. This is a narrow independent display adapter for sanitized stored data rather than connecting the existing full live viewer to the raw private archive. Full live viewer integration remains future work. No fake data fallback, no sporting accounting, no changes to race engine, clock, worker or scheduler.

Consolidated owner-local acceptance, no hosted write:

```bat
git pull origin main
node --test tests\uraniusParticipantReplayPreview.test.mjs tests\uraniusSquadHostedBundle.test.mjs
node tests\uraniusRider018FullHistoryNativePg17.mjs --participant-replay-review --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Expected five Node tests and four new native PG17 checks (historical setup replays automatically within the new isolated test). Native scratch adapts only pinned archive ID/digests to actual disposable archive and TLS predicate for local rehearsal, never targets hosted DB. Validate both participants see same archive, unknown and withdrawn participant see no rows, no raw/private or mutation access, rollback/duplicate refusal and policy restoration. New tests and bundle not executed by assistant; no local checkout or direct migrator credentials here. After passing, freeze 024 SQL/manifest, obtain explicit approval, install via guarded launcher and independently verify. Only then use existing HTTPS launcher with -RaceReplay. Current progress 49/60 unchanged. No production changes or added costs.
