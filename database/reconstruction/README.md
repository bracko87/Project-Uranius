# Migration 005 approval package

Target is Project Uranius `sdtsivgtcaoaeoihcwzd`, PostgreSQL 17, through the existing restricted `uranius_migrator` login and pinned TLS verify-full direct endpoint.

| Artifact | SHA-256 |
|---|---|
| 005_club_identity.sql | 9550e9ef78288f9286387c43595e6649bd8bcea378d29b0db665d0b048a065fc |
| manifest.json | 8d7e8c514e87c2cd8c9d9b7b19bd4d663b4d53e9b144864e9a46bb69e0a9b6ce |

The manifest requires all four existing foundation hashes and an absent managed migration history. The initializer acquires the existing advisory lock, verifies stored identity, role, SSL, server major and exact ledger, then applies this one file and records it in the authoritative ledger in one transaction. The existing initial manifest and migrations are not modified.

Expected changes are RLS enabled on the two private bookkeeping tables without FORCE or client policies, one new schema uranius_game, an empty club_profiles table with one owner-filtered SELECT policy, one invoker clubs view, one invoker UUID resolver and a fifth ledger row. Authentication, teams, riders, routes and economy data remain as they are. This package does not expose the schema through the Data API, modify Auth settings, enable schedules or seed any users.

After explicit approval for the above digest, supply the existing migration DSN, exact project ref/API origin, CA path and trusted psql path through secure local settings. Recheck hosted identity, absent uranius_game and the exact four ledger entries, then invoke:

```powershell
node scripts/apply-club-reconstruction.mjs --apply-reviewed-club-reconstruction 8d7e8c514e87c2cd8c9d9b7b19bd4d663b4d53e9b144864e9a46bb69e0a9b6ce
```

An error before commit rolls back both migration DDL and its ledger entry. Inspect live catalog and ledger read-only after any failure. Never retry blindly or delete ledger rows. Following a successful apply, a correction requires a separately approved forward migration. If a rollback is needed, review dependent objects and downtime first, then reverse only the reviewed package in a new migration. Keep the ledger append-only and prefer retaining bookkeeping RLS.

The offline-only verify-offline.sql suite requires a loopback disposable database whose name starts uranius_005_test_. It inserts two synthetic identities inside a transaction and rolls back. Do not run that file against Supabase. After an authorized hosted apply, verify the expected object counts, policy and privileges, empty club table and fifth ledger hash with read-only catalog queries. No client API exposure is needed for these checks.
