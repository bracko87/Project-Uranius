# Uranius Overview 010 — atomic installation review package

**Status: REVIEW ONLY — NOT APPROVED OR DEPLOYED.** Target `sdtsivgtcaoaeoihcwzd` (isolated Project Uranius), PostgreSQL 17. Never target original ProPeloton Manager.

## Exact files and digests

- Candidate: `010_overview_race_reader_REVIEW_ONLY.sql`
  - SHA-256 `56f52ac20c84aaf70ea63c68e0435da20084a3fe42e375a372c3d613cfa445af`
- Approval manifest: `010_install_manifest_REVIEW_ONLY.json`
  - SHA-256 `26cdce51966cf2264ff2ec49affe8c987f5cbcb447040807c61354382092a170`
- Source-backed schema `010_race_schema_DISPOSABLE_REVIEW_ONLY.sql`
  - SHA-256 `0ba08cbd951dcf74a9669767a4b3b24670ba0a2e08941934721d8525262e5738`
- Reviewed RLS `012_owner_schedule_reader_DISPOSABLE_REVIEW_ONLY.sql`
  - SHA-256 `02f55d08d1a9a190e504ee4aae68a6de99f3f6c334b0ccd8350f54d65b037ef7`

## Scope of proposed change

This is **one migration** (`010_overview_race_reader.sql`) combining the previously native-tested structure and policy candidates. It creates four **empty** race tables (110 source-backed columns), their original PK/unique/checks and internally adapted FK relationships, four restrictive `uranius_smoke_reader` read-only RLS policies and column-scoped grants, and one custom ledger entry. It enables FORCE RLS on all four new tables. No player data, Auth mutations, API exposures, scheduled processes or source-production changes. Deferred foreign-key dependencies on country/finance/equipment remain explicit. Database objects should not be considered final racing-engine parity.

## Guardrails

The proposed runner `scripts/apply-uranius-overview.mjs` provides two mutually exclusive modes:

- `--review` checks exact source, candidate and manifest bytes **offline**, without opening a database connection.
- `--apply-reviewed-overview <manifest-sha256>` exists for **separately approved installation** and requires the exact review digest, pinned Uranius direct endpoint, `uranius_migrator` login, verify-full TLS, CA and PostgreSQL client.

Database preflight checks the exact **nine** existing version/hash pairs (both directions), role, TLS, PostgreSQL 17, existing fixture counts, paused clock and absence of race tables. The installer uses a single transaction and appends the ledger entry only after successful DDL; its postflight asserts the policy count, FORCE RLS, reader read privilege, and denied client/write access **before commit**. A failure rolls the whole transaction back. Duplicate runs should fail closed. Do not run a destructive rollback after installation without a separately reviewed forward migration.

**Read-only hosted preflight (2026-11-23):** verified PostgreSQL 17, custom ledger 9/9 exact expected hashes, two mapped managers, 200 riders, one paused season-one clock row, zero candidate race tables and existing restricted smoke-reader login. This is metadata/count only; nothing changed.

**Prior native evidence:** user-reported 19/19 full-foundation JWT/RLS tests, with disposable PostgreSQL and cleanup. **New combined migration and installer review suite has not yet been executed**, so it is not approved for hosted installation.

## Current local offline verification

```bat
git pull origin main
node --test tests\uraniusOverviewInstallPackageReview.test.mjs
node scripts\apply-uranius-overview.mjs --review
```

Both commands are offline and cannot apply a migration. Do **not** use the apply mode or enable `URANIUS_OVERVIEW_SCHEDULE_READ_APPROVED=1` yet.

## Outstanding approval gate

1. Pass offline package source and CLI review tests, and inspect any discovered mismatch.
2. Validate the **exact combined** candidate against a disposable PostgreSQL 17 foundation (preflight TLS may need an isolated TLS-enabled fixture); test duplicate and failure-injection rollback.
3. Request explicit owner approval tied to the specific manifest SHA-256 and isolated target, including acknowledgement of new four tables and server-role read policies.
4. Only then execute through reviewed guarded connection and inspect custom ledger + policies read-only. Finally enable/test HTTPS A/B schedule reader and connect frontend separately.
