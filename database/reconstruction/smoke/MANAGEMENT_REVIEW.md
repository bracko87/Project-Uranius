# Migration 007 through the Supabase management connection

**Review only.** Submit [007_management.sql](007_management.sql) only after the owner authorizes this execution path.

| Item | Value |
|---|---|
| Supabase project | `sdtsivgtcaoaeoihcwzd` |
| Management SQL SHA-256 | `4b3b9f30a593934d5c364f24fe1c7dbe25d0600313eea886866b3f51554414df` |
| Original reviewed manifest SHA-256 | `b54be955f5cb40ac9863162ce4a827d470bbffb2b2a7306a14527c150f205910` |
| Canonical ledger version | `007_smoke_reader.sql` |
| Canonical ledger SHA-256 | `dd0e9663adc2bf0717d4debc8b291ee04e859592369e381bbde7a42546a8f91b` |

## Execution after approval

1. Verify the exact bytes of the committed management SQL and canonical package against the table. Use only the connected Supabase integration. Pass the literal project ID to the project-scoped calls. Verify the project identity, review fresh security findings and confirm the Data API exposure and signup settings are unchanged. No local migration password, new account, CLI or direct database connection is required for this route.
2. Submit the exact file as the single `query` argument of the integration's `execute_sql` call with `project_id` set to `sdtsivgtcaoaeoihcwzd`. The single DO statement is atomic. This deliberate exception to using the standard Supabase migration tool keeps all seven hashes in the existing custom ledger and avoids initializing a second migration history. The integration's HTTPS connection secures transport to Supabase. This path has no client-side direct PostgreSQL TLS certificate check and makes no assertion about transport between Supabase's gateway and PostgreSQL.
3. The statement requires PostgreSQL 17, database `postgres`, matching session/effective user `postgres`, the stored project identity, exactly six known hashes and no Supabase migration-history table. It verifies the existing reader is already LOGIN, NOINHERIT, read-only by default and lacks admin, RLS bypass, private schema access and outgoing memberships. The only tolerated incoming membership is the existing creator/admin membership to `postgres` that PostgreSQL 17 can create automatically. It leaves role settings and memberships untouched.
4. Read back exactly seven canonical ledger rows, the old six unchanged. Compare the exact seven column-level grants, the two schema grants, the two function grants, the six policy memberships and the invariant RLS predicates with the reviewed package. Check for unexpected effective permissions and role memberships, and refresh the Supabase security advisors. Pending actual browser sign-in, report this as database activation only. The existing browser runner still requires its current reader and manager credentials locally.

The only durable changes are the same grants and six policy-role additions as in the canonical SQL, plus one canonical ledger record. The script compares all existing catalog and game fixture rows and policy definitions before and after. Expected totals are 20 teams, 200 riders, 3 stages, 450 starters, 20 clubs, 20 opening balances of 10,000 credits, 3 calendar rows and 2 distinct owners of teams 1 and 2. No identities are returned by the statement.

## Failure and rollback

Any SQL error rolls back all changes in the statement. If the connector reports failure or loses the response, stop and inspect the exact ledger and ACL state read-only before doing anything else. Six rows with no new grants indicate rollback. Seven exact rows with the expected grants indicate commit. Unexpected partial or mismatched state requires investigation.

For a committed migration, request separate approval for a forward retirement package. Disable only reader LOGIN and verify its existing sessions have ended. Restore the same six policies to `TO authenticated` and revoke only the seven column grants, the two function grants and two schema grants made by 007. Keep the original six entries and the 007 entry intact, plus all original rows and existing authenticated access. The existing role is retained. See [retirement checks](HOSTED_ACTIVATION.md#reader-retirement-for-separate-approval).
