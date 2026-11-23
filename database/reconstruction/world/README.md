# Migration 006 synthetic world approval package

Only the pinned Project Uranius target sdtsivgtcaoaeoihcwzd, PostgreSQL 17, and the existing restrictive uranius_migrator TLS connection are eligible. Dependency is the exact five-entry ledger through 005, with no managed migration history. Review this package before any hosted write.

| File | SHA-256 |
|---|---|
| 006_synthetic_world.sql | 56f1a9f08ff1fba3f3ad9a91688c512316b74b2f37fb8806668147ae8813a9a3 |
| manifest.json | 7df2b37dec41fa6ddd93eb22f48bcb149f72b49f7857705805d572cb98995081 |

006 seeds 20 fictional club profiles against the existing 20 team IDs, three fixture calendar entries on season days 7/8/9, 20 opening snapshots of 10,000 fixture credits, and exactly two private manager slots paired with teams 1 and 2. It leaves 200 riders, 450 starters and terrain intact. Opening credits are test data. They do not post real finance movements or replace any game calculation. The stage calendar is a fixture table. It does not start races or advance the game clock.

No Auth users or ownership rows are created by the migration. The new private invoker binding function is executable only by its owner and accepts two distinct UUIDs, writes only those two approved mappings, preserves existing matching rows, refuses conflicts, and locks ownership during binding. Native RLS verification uses two disposable UUID subjects. Hosted Auth creation and binding require separate approval and verification that both UUIDs belong to the intended synthetic accounts in this exact project. A later scope must ensure no extra account exists and validate account-to-club mapping through live local login. Keep Auth passwords and account UUIDs outside the repository and reports.

After explicit approval, use the existing secure local migration settings and run:

```powershell
node scripts/apply-synthetic-world.mjs --apply-reviewed-synthetic-world 7df2b37dec41fa6ddd93eb22f48bcb149f72b49f7857705805d572cb98995081
```

The guarded runner validates TLS and role, locks and checks the exact prior ledger, and commits DDL, fixtures and migration history in one transaction. Replay stops on the ledger guard. An injected failure rolls back all new objects and writes. A post-commit correction requires separately reviewed forward SQL. Do not delete ledger rows or apply a rollback blind. The offline fixture SQL requires a loopback test database named uranius_006_test_* and rolls back synthetic bindings. Never run it against Supabase.

Offline PostgreSQL 17.12 tested all hashes, the restricted role, rollback, duplicate apply denial, reentrant binding, conflict and duplicate UUID rejection, private ledger/schema isolation and separate manager clubs, riders and balances. Each manager saw exactly one club, ten riders and one balance. The calendar was shared. The five prior ledger hashes and foundation checks remain required during approval execution.

## Private Windows execution

Run this from an interactive Windows PowerShell 5.1 window once ready to apply the reviewed package. Supply only the existing role password at the masked prompt. No Auth credentials are needed.

```powershell
Set-Location 'C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review'
.\scripts\Connect-UraniusDatabase.ps1 `
  -PsqlPath '..\.uranius-pin-review\postgresql-17.12-portable\bin\psql.exe' `
  -CaFile (Join-Path $env:USERPROFILE 'Downloads\prod-ca-2021.crt') `
  -ResumeExistingRole -SyntheticWorld -Apply `
  -ApprovedManifestSha256 '7df2b37dec41fa6ddd93eb22f48bcb149f72b49f7857705805d572cb98995081'
```

SyntheticWorld selects precisely this manifest. It cannot be combined with ClubReconstruction and requires ResumeExistingRole. The wrapper performs a read-only login probe, then the runner checks the exact five ledger rows under the same lock and transaction as 006. Expect **Reviewed synthetic world migration applied.** If the command stops, inspect hosted state read-only before attempting any retry.

The complete wrapper test is tests/uraniusSyntheticWorldWrapper.test.ps1. Run it from an interactive Windows PowerShell terminal with the trusted PostgreSQL 17 bin directory, OpenSSL executable, and an external scratch directory. A disposable TLS fixture binds only to 127.0.0.1 port 45680. The test proxy accepts only the expected guarded connection settings, then forces loopback. No hosted credentials or remote queries are used.
