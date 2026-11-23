# Migration 007 smoke reader approval package

Target exclusively Project Uranius sdtsivgtcaoaeoihcwzd, PostgreSQL 17, pinned direct TLS verify-full. Requires the exact six-entry ledger through 006. No Data API schema exposure change.

| Approved artifact | SHA-256 |
|---|---|
| bootstrap-reader.sql | 154fb2c02f0295b4ed886d6a2a1cfdd9947edb5427c946f961f29278c6d9fd3a |
| 007_smoke_reader.sql | dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b |
| manifest.json | b54be955f5cb40ac9863162ce4a827d470bbffb2b2a7306a14527c150f205910 |

## Exact proposed changes

1. The project DBA creates one NOLOGIN, NOINHERIT, non-admin role named uranius_smoke_reader. The bootstrap grants CONNECT on postgres and sets its default to read-only transactions. In the same reviewed operation, set a distinct password through the private psql password prompt, then enable LOGIN via ALTER ROLE uranius_smoke_reader LOGIN. Reject pre-existing role state unless previously verified by the owner. Grant no role memberships.
2. The existing migration login applies 007 under the guarded runner. Its six-hash check, exact stored project and TLS checks run in the same transaction as the grants and ledger insert. 007 checks the reader restriction flags, absence of memberships, no persistent CREATE grant, no private schema access, current RLS and the invoker view. It grants USAGE on two schemas and EXECUTE on two existing read functions. Seven projections receive SELECT column grants only. For squad and calendar it grants only rider_id and stage_id for counts. For opening balance it grants only credits. The existing invoker club view requires the narrowly listed backing fields. Six SELECT policies gain the reader role using unchanged predicates. No DDL to expand API exposure and zero hosted data writes besides the authoritative migration ledger.
3. Recheck the seven ledger hashes, exact grants and role restrictions, zero unexpected data changes and Data API settings. Verify both managers using the local HTTPS app and their existing accounts. Runtime uses verify-full PostgreSQL with a separate reader password. The trusted local adapter must retain exclusive custody of that credential because it can set the verified subject inside its transaction. A leaked reader credential could be used to choose another Auth subject, so keep it in ephemeral server memory and grant only this fixture scope.

Use the review command only after explicit approval and verified role bootstrap:

```powershell
Set-Location 'C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review'
.\scripts\Connect-UraniusDatabase.ps1 `
  -PsqlPath '..\.uranius-pin-review\postgresql-17.12-portable\bin\psql.exe' `
  -CaFile (Join-Path $env:USERPROFILE 'Downloads\prod-ca-2021.crt') `
  -ResumeExistingRole -SmokeReader -Apply `
  -ApprovedManifestSha256 'b54be955f5cb40ac9863162ce4a827d470bbffb2b2a7306a14527c150f205910'
```

An application error rolls back the grant/policy and ledger transaction. The separately bootstrapped role may remain with zero app grants. Inspect its state and the ledger before retrying. If a committed change needs rollback, separately approve disabling LOGIN and a forward migration withdrawing the reader grants/policy memberships without altering prior ledger entries.
