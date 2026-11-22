# Frozen offline race baseline

The tested baseline is commit a7491a5a59f582605d799ec23adc9f22cf8e1be5 in the sanitized Uranius repository. It uses runDeterministicRoadRace in existing_v1 with the input settings and fictional rosters in src/race-engine/tests/fixtures. The canonical hash covers the entire returned simulation output. Expected hashes, snapshot and event counts and roster checks are encoded in executable tests.

| Fixture | Riders | Distance | Canonical output hash | Frames | Events |
|---|---:|---:|---|---:|---:|
| Flat, climb and descent micro-stage | 10 | 10 km | 98cdb350835b7fde | 32 | 12 |
| Flat road stage | 24 | 30 km | a16eeb4aa3fd0bc6 | 86 | 26 |
| Hilly road stage | 48 | 30 km | 7ed8f7c2a7e0d7c6 | 89 | 50 |
| Mountain road stage | 96 | 30 km | c5152197cecfe4d0 | 100 | 98 |
| Flat road stage | 96 | 30 km | 364c8989142147b5 | 86 | 98 |

Acceptance requires exact repeated output, fixed golden metrics, conserved rider identities, a deterministic synthetic puncture, and the offline benchmark limits recorded in ARCHITECTURE.md. The independent constant-speed reference gives positions, membership and crossing times to test separately from engine output. Use Node 20.20.0, the locked app dependencies, cached Vitest 4.1.11 and the Node guard runner. TEST_REPORT.md records commands and results.

## Continuation gaps for Milestone 3

1. Inventory and preserve complete tick state with input, timers, RNG, order progress, incidents, fatigue, event counters and group membership. Establish serialization and restoration equivalence before relying on replay snapshots.
2. Record an authoritative, idempotent accepted-command sequence with effective ticks and explicit ownership. Define rejection and elapsed-boundary handling before connecting command intake.
3. Recompute only the future from a verified checkpoint. Assert byte-equivalent canonical elapsed output, no-command equivalence and repeatable restart behavior.
4. Keep game time, simulation time and display time separate. Preserve the existing live timing policy until deployed behavior and any required decision can be validated.
5. Continue publishing only synthetic offline evidence. Historical parity, time-trial execution in this lane and deployed performance remain open. The quarantined source data stays outside the development repository.

No sporting rules changed during this baseline audit.
