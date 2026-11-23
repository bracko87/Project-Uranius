# U5.03 hosted smoke access review

The owner confirmed both Auth sign-ins and committed mappings on Project Uranius sdtsivgtcaoaeoihcwzd. A owns Team 1 and B owns Team 2. The approved six migrations and synthetic race data remain in place. No hosted API settings or schema changes were made in this turn.

## Implemented offline

The loopback browser path bundles the existing Login and club-context modules through a local transport, then renders a limited authenticated club dashboard. Its HTTP adapter stores a short-lived, opaque server-side session in an HttpOnly and SameSite=Strict cookie. Mutating session endpoints require the exact loopback Origin. The browser cannot send a DB role, subject or SQL. The trusted transport binds only the verified subject to a read-only transaction and uses the unchanged PostgreSQL RLS through the existing roles. SQL reads the club lookup, its invoker view, rider count, opening balance and calendar count. Browser and direct HTTP checks verify own data, anonymous denial, cross-origin login denial and invalidation of an old cookie after logout.

The browser harness uses a fictional sign-in provider and a disposable PostgreSQL 17.12 database with all six actual migrations. It is local-only and does not accept hosted database targets. Known test identifiers are synthetic. The HTTP fixture uses a non-Secure cookie solely for loopback testing. The proposed hosted Auth smoke requires local HTTPS and a Secure session cookie. Hosted browser sign-in, JWT verification and full dashboard behavior still need separate acceptance.

## Smallest hosted access proposal

Keep all Data API schema exposure settings unchanged. Route Password Auth and user verification only to the pinned Uranius Auth origin, using the existing official client pattern, the project publishable key and separately validated sessions. Use a loopback HTTPS adapter, no session storage in browser-accessible JavaScript, no organizer or service key, and revoke the local Auth session at logout.

Prepare a separate target-pinned SQL package for a dedicated server-only read role without any owner or authenticated role memberships. Grant schema USAGE on uranius_game and uranius_catalog only, EXECUTE on the two existing identity functions, SELECT only on the view and required base/columns (club_profiles, teams, team_owners, riders, opening_balances and stage_calendar), and extend only their established SELECT policies to the reader. The adapter must use fixed parameterized requests in read-only transactions, set claim scope from the server-verified subject, and accept no browser-supplied tenant, subject or SQL. Keep the role credential local and require DB verify-full. Do not grant access to uranius_private, replay futures, writes, Auth tables or migration routines. Rehearse exact grants, RLS, invalid credentials, anonymous, logout and cross-manager failure before presenting a DDL digest to apply. Never use the offline test role membership model on Supabase.

Approval requested for this design, then review the exact SQL/manifest and ask separately before applying it. No role creation, hosted migration, additional exposure or access attempt is authorized by this review. A later hosted browser smoke must run once against the exact Uranius pair and verify both positive and negative paths with the approved credentials. Full Overview work remains gated by game clock, schedule/result, operation, squad, finance and notification contracts in reference/DB_RECONSTRUCTION_PLAN.md.

## Leaked-password protection

The Supabase warning concerns a project Auth setting. The Pro plan supports rejecting passwords known to the Pwned Passwords service. Recommend enabling leaked-password protection only in the Uranius Auth settings after separate approval. Verify the warning clears and test both existing managers. The warning alone does not establish either password was leaked. Preserve working credentials unless Auth reports an account-specific weak-password result and any necessary password change is separately approved. Keep signup closed and make no production configuration changes. [Supabase password security](https://supabase.com/docs/guides/auth/password-security)

## Implemented HTTPS runner and approval boundary

The reviewed [007 package](../reconstruction/smoke/README.md) is prepared. The runnable adapter is scripts/run-uranius-hosted-smoke.mjs. Once the role, SQL and hosted verification are separately approved, launch the runner from an interactive terminal with:

- URANIUS_SMOKE_TLS_CERT and URANIUS_SMOKE_TLS_KEY pointing to a locally trusted certificate and private key for IP SAN 127.0.0.1, outside Git.
- URANIUS_DATABASE_CA_FILE pointing to the Uranius Supabase CA from the project dashboard.
- URANIUS_PSQL_PATH pointing to the trusted local PostgreSQL 17 client.

Run `node scripts/run-uranius-hosted-smoke.mjs --reviewed-hosted-smoke`. Enter the reader password and publishable key at masked startup prompts. Open the printed loopback HTTPS URL in an isolated browser profile whose trust store trusts the loopback certificate. Never bypass certificate validation or expose the listener externally. Use the two existing manager passwords only on the local HTTPS Login form. The server uses the pinned official Supabase Auth flow, retrieves the confirmed user, keeps Auth tokens in memory, then binds only the returned UUID as a quoted psql value for a fixed TLS read-only query. The Auth credential is not sent to PostgreSQL. The browser receives an opaque Secure, HttpOnly, SameSite=Strict session cookie. Session expiry is capped at the earlier of 15 minutes or Auth token expiry. Logout deletes the local session and attempts Supabase local-scope sign-out. A previous cookie is unusable even if upstream logout fails.

Acceptance uses both managers, an anonymous browser, an old cookie after logout and an attempted cross-origin request. The smoke serves the original Login page, existing stylesheet and club-context helper, plus a limited dashboard projection. It exposes no new Supabase schemas. The full Overview is a separate integration task. The leaked-password-protection setting remains unchanged.
