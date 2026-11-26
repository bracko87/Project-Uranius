# 043E — original canonical marker/profile reconciliation (offline source review)

2026-11-26. 043D owner native 7/7 accepted. No production or isolated hosted DB access, player records, schema, worker, clock, scheduler, finance or official effects. Existing accepted modules unchanged.

## Source evidence

- Original ProPeloton-Manager src/universal-race-engine/buildProductionRaceInput.ts at pinned b2a763a6b62b001b63ebbdd68d9a4e3454dce5e2, blob f520ab08d05dc406918d34295d02ca6ef1f53cb2, lines 320–544. Original earlier commit 271f79db6fdf5b6117be5c7c9f947e6faf6d78af blob d9df9af18f014e658354e6035f45990df4137ae3 contains the same marker reconciliation logic. Canonical point ID/type/schemes/bonuses retained; explicit profile sprint/climb arrays take priority over route markers; family-matched ordered physical geometry replaces stale canonical km/name/KOM category only when family counts match; canonical-only fallback if no physical scoring markers. Route timing label exemption prevents a legacy sprint icon from becoming a scoring competition.
- Original migration 20261014074500_guard_time_checks_from_sprint_scoring.sql at 20a8b5b550204b56fce4a1653c0daf35e61dd546 blob a9dad6132eed552338cbf547a9232bd933a9f35c: two historical generators, existing canonical definitions preserved unless explicitly forced, timing-type/name filtering, road finish bonus vs no normal finish bonus in time trials. Different historical generator schemes exist; do not silently invent or overwrite the configured canonical arrays. Neither original migration executed here.
- Historical 20261013214800_correct_zlm_itt_non_scoring_time_gate.sql at f4706f491d0b82c1cbcef2db39950f94043cc246 blob e7938ea5ce3f9f4ef85b823c6e07f5d31803d0d6: timing marker correction, no scoring catalogue replacement.

## Implementation and limits

scripts/uranius-canonical-marker-review.mjs (4b3da6039dd3e6c0e41758ea8328c5908aee03d9): source-aligned strict synthetic normalized row adapter with explicit stage and profile coverage, immutable canonical IDs/schemes, family-count pairing, geometric and timing-only checks, deterministic sorted scoring points (038 shape) and trace markers (039 shape), digest. Deliberate stricter review boundaries vs original permissive normalization: refuse missing IDs/schemes, unknown categories, out-of-range distance, inconsistent finish flags, foreign rows, timing-as-competition, malformed evidence rather than clamp/drop/default; recognize explicit timing markers as non-scoring and refuse ambiguous timing-only profile with scoring rows. No intermediate competition or time bonuses in ITT/TTT/prologue review; no new time-trial engine support. All official/write/accounting flags false. No authority from caller-provided evidence. No actual original point rows fetched. Zero-intermediate stages return empty trace markers; existing 039 trace collector requires nonempty markers, so a caller must use a separate finish-only scoring path. No active-manager or withdrawal trace change. Shared group tie policy remains review-only.

tests/uraniusCanonicalMarkerReview.test.mjs (c0bd1855e799c046782990f3516a4da5f020411b): seven groups for explicit profile priority, route fallback, timing exclusions, canonical-only/finish-only geometry, mismatch and malformed refusal, ITT bonuses, legacy timing labels. Exact re-fetched module/test and canonical digest serialization exercised in development JS with assertion and structured clone shims and canonical string substituted for SHA-256; 7/7 passed. Native Node and actual cryptographic digest pending.

Run:
```bat
git pull origin main
node --test tests\uraniusCanonicalMarkerReview.test.mjs
```

Expected 7/7. No database, policy snapshot or credentials needed. Next bind actual isolated server-owned profile and scoring rows to engine-generated trace and independent receipt; canonical marker writer/health catalogue and resource persistence contracts still require source reconciliation. Any original production metadata/configuration inspection must be separately explicitly authorized, not inferred from earlier bounded approvals. Hosted activation BLOCKED, overall 49/60.
