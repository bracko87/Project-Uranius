# 041 — stage equipment, supply and health effects (offline review)

2026-11-26. 040 accepted. 039 four native boundary groups confirmed; two full-engine groups still unconfirmed. No database access, production changes, official inventory updates, health case writes, finance, clock or infrastructure changes.

## Recovered source and scope
- reference/database/20260929184654_baseline_04_sql_dump_241_360.sql.txt (ffe44295fafa18768b12231d4e1c30ae7d58c143) lines 9886ff: planned supplies aggregate explicit rows and use direct rider totals only for keys without explicit rows, including explicit zero precedence. Normalized valid inputs only in review; original malformed input fallback not replicated. 
- reference/database/20260929184629_baseline_04_sql_dump_121_240.sql.txt (9bc96f225f13a36d443da9e436a0bca02cde7cb3), lines 1282ff: jersey maximum ten stage uses, rain jacket 25; usable ready/assigned and positive remaining uses. 6534ff: MD5 first 48 bits / (2^48-1), rounded six decimals. 8500ff: case code aliases. Actual usage writer not recovered; fixture stock conservation and one-use-per-durable-unit-per-stage require explicit synthetic usage, not a claim of exact production consumption.
- reference/database/20260929184719_baseline_04_sql_dump_361_416.sql.txt (c53e0bec4ae2987fea2d72289abc1154079f2558), 603ff: max absolute normalized effect, van protection cap30, workshop field recovery cap50, workshop/medical van condition factors at 90/75/60/45/30 thresholds. No invented level effects or actual wear calculation.
- Original ProPeloton-Manager a708a038646fd61941dbcd495c6b35d77853d308, supabase/migrations/20260921165843_restrict_missing_equipment_wear_guard_to_user_clubs_v1.sql (6d9636ac0ba10383f6a963c47d09c1cfa45c7289): historical compatibility fallback only when run-wide canonical equipment wear absent, user not AI, loss distance/100*0.35, condition floor0, distance and race-day counters. Review does not infer missing canonical item receipts, apply fallback on partial canonical record, or assume this historical source equals current deployed writer. Canonical asset/equipment wear writer still missing.
- reference/database/20261003113900_race_health_candidate_existing_open_case.sql.txt (ed173991bd42ee424d4f642421aae732e94bd74c): normalize severity, deterministic preparation risk protection clamped .78..1, incident dedup, merge into stronger open case, otherwise supersede and preserve previous restrictions/recovery deadlines in original writer; minor/moderate selectable not_fully_fit, major selection blocked. Review identifies disposition only; does not create or resolve cases, decide final restrictions, calculate recovery dates, or generate incidents. Stricter stage/rider/incident receipt key in fixture, not copied production context schema. Catalogue durations, merged restrictions/deadline handling and actual crash/mechanical candidate generation still outstanding.

## Implementation and validation
scripts/uranius-stage-effects-review.mjs (d4c5054f3fbc9a9db0ca037620cbc025e8e20546; own-key alias guard 47ed8ab4cc11c3674218e90c6893ead88fc999e2): pure supply planning, explicit synthetic stock usage and durable decrement, capped asset modifiers, historical fallback equipment wear, deterministic health candidate disposition. Every output unofficial, write/accounting forbidden; does not mutate input. Requires valid identifiers and explicit synthetic receipt coverage for effects. No authoritative integration. tests/uraniusStageEffectsReview.test.mjs (de6e3242c90925c8fc7f451cba4e33c1eff23e5d; corrected independent MD5 expected value 0bb0081f7fbf9426454bc7e0a2e72630efba1e71): eight groups executed against exact re-fetched committed source in development JS with assertion and MD5 lookup shim (known hashes independently calculated using Python hashlib). 8/8 PASS. Native Node crypto/module suite pending. No prior accepted tests repeat.

Run:
```bat
git pull origin main
node --test tests\uraniusStageEffectsReview.test.mjs
```

Next recover base stage workload and canonical effects writer contracts, authoritative roster/point/supply/equipment/health receipts, and resolve 039 full-engine acceptance. Then integrated finalization with transactional effect rollback and dedup in disposable native database. No hosted integration authorized. 49/60 verified; U5.09 still in progress.

## 2026-11-26 — owner native acceptance

Owner pulled 3f2a466 and ran node --test tests\uraniusStageEffectsReview.test.mjs: 8/8 PASS, zero failures, cancellations or skips. Native Node crypto and module execution confirmed. Scoped 041 offline acceptance CLOSED. Canonical consumption/wear writers, health catalogue and actual incident generation remain unresolved; no authoritative integration or hosted effects. No repetition of accepted tests unless relevant code changes. 039 remains four of six confirmed. Next 042 integrated synthetic transaction review, with original-source gaps remaining explicit release blockers.
