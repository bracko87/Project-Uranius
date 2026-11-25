# U5.04 — private completed race archive review (2026-11-25)

021 installed and independently verified: 16 ledger entries, ten startlist selections 5+5, 3 races / 4 stages / 2 separate accepted entries / 2 preparations, 200 riders, paused clock, zero startlist reader grants. Read-only hosted inventory found no run/checkpoint/command/timeline/result/classification tables in reconstructed Uranius schemas.

022 is a **review-only** first slice of U5.04, not a hosted release or complete hybrid contract. It creates a private completed synthetic run archive with exact text input/output, SHA-256 checked by PostgreSQL, unique stage/version/engine lane/input digest, foreign keys to the race and stage, invoker-only validation trigger, FORCE RLS and zero client/reader grants or policies. The trigger rejects mismatched stage/race, unmatched accepted startlist identities, missing/duplicate riders and finish ranks, and updates/deletes. Deliberately supports only the existing_v1 no-command two-team ten-finisher synthetic review case; it is not proof of generalized results/validation, live race execution or accounting. No worker grants, no public result publication, no live scheduling or clock change.

The optional disposable native flag runs the previously accepted 021 adapter on actual scratch DB data, then adds the temporary rival entry only in the disposable database so stored accepted selections match the archived run. It inserts exact serialized StageInput and SimulationOutput, checks committed hashes and readback in a fresh SQL session, rejects duplicate runs, updates/deletes, changed roster, duplicate ranks and wrong digest. The first insertion is rehearsed in a rollback transaction; all scratch data is removed on cleanup. No output payloads printed to the console. Full predecessor replay is included in the single command, not an additional separate test request.

```bat
git pull origin main
node tests\uraniusRider018FullHistoryNativePg17.mjs --race-persistence-review --disposable-native-pg17 --postgres-bin "C:\Users\Aleks\Desktop\Project-Uranius\.uranius-pin-review\postgresql-17.12-portable\bin"
```

Expected 6 new checks, 76 total including predecessor replay. New source and harness not executed yet. The earlier 021 owner output hash applies to that specific scratch database (random UUIDs change across fresh replays), so only within-run repeat and actual byte digest equality are required. No hosted 022 installation is approved. After native acceptance, review whether to extend archive to versioned input/run/checkpoint/commands and normalized classifications before freezing broader release; do not treat this as an official game result or complete U5.04. 49/60 remains unchanged. No production changes or costs.
