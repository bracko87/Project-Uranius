# U5.03 two-manager Auth and ownership proposal

Only project sdtsivgtcaoaeoihcwzd is in scope. The pinned Auth host is sdtsivgtcaoaeoihcwzd.supabase.co and the pinned DB connection is the existing uranius_migrator role with verify-full. The approved six-file ledger through 006 is required. This proposal requests account creation and binding only. Data API exposure and application wiring remain separate.

## Proposed account creation

After approval, open Authentication > Users in the exact Uranius dashboard. Use the built-in admin create-user action with email confirmation, equivalent to the supported Admin createUser operation with email_confirm true. Use distinct generated passwords stored only in the local password manager. Use the two local parts fixture-manager-a and fixture-manager-b at the reserved domain uranius.example. Do not use an invitation, email delivery, a public signup route, third-party provider, production account or direct SQL insert into auth.users. [Supabase Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)

Confirm the hosted user count is zero before starting. After each creation verify the dashboard shows the expected address and confirmed state. If interrupted, inspect the exact addresses and total count before continuing. Create only the missing approved account. Halt on any unrelated user, unexpected UUID or failed confirmation. Keep the two passwords and immutable Auth UUIDs out of conversation and source files. No additional hosted change is authorized by this document.

## Identity proof and binding

The private terminal script signs in to the pinned Uranius Auth endpoint with the project's publishable key and each manager's password. It calls Auth's verified user endpoint, checks the exact fictional address, confirmation and matching, distinct UUIDs, and signs out each temporary session. This creates temporary hosted Auth sessions and requires approval even when no binding flag is set. [Supabase Auth getUser](https://supabase.com/docs/reference/javascript/auth-getuser) · [Supabase Auth signOut](https://supabase.com/docs/reference/javascript/auth-signout)

After approval, run the verification command without the binding switch first, in a private terminal. If both managers succeed and the hosted user count is exactly two, repeat with the binding switch. Local prompts keep passwords out of source, command lines and reports. Do not run with terminal transcription. A publishable key is sufficient. Never provide a service role key, project-wide secret or organization token.

```powershell
Set-Location 'C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review'
.\scripts\Bind-UraniusSyntheticManagers.ps1 `
  -PsqlPath '..\.uranius-pin-review\postgresql-17.12-portable\bin\psql.exe' `
  -CaFile (Join-Path $env:USERPROFILE 'Downloads\prod-ca-2021.crt') `
  -BindReviewedManagers
```

The wrapper re-verifies both users with Auth before opening a database transaction. It checks the exact stored project, role restrictions, TLS, PostgreSQL major, six ledger hashes and expected slots. It binds A to Team 1 and B to Team 2 through the existing private invoker function, then verifies there are exactly two matching mappings before committing. It neither modifies Auth tables nor runs DDL. Same-owner retries are idempotent. Stop on failure and inspect state read-only before retrying. Report aggregate counts and pass/fail only.

## Access and game smoke scope

Once accounts and mappings are approved and verified, the next live smoke test should use an approved local API path. Two separate browser profiles sign in and out through the existing Login page. Expect one own club, ten own riders, one own opening balance, and three shared calendar entries. Check unauthorized team reads and private table/function access, then confirm a signed-out session cannot recover private data. Keep Data API schema exposure unchanged until separately reviewed. The native loopback rehearsal already exercises PostgreSQL ownership policies with two disposable subjects. The offline browser exercises the original Login page and the club-context lookup, using fixture Auth and a limited dashboard projection. It verifies login, logout, cross-manager and anonymous denial at the fixture boundary. It does not validate hosted Auth or the real Overview.

The full Overview still needs the audited read contracts for the game clock, race schedule/results, active operations, squad pulse, finance summaries and notification fallback. No sporting, finance, signup, replay or production behavior changed. See reference/DB_RECONSTRUCTION_PLAN.md.

## Verification-only diagnostics

The owner reports both synthetic accounts are present and confirmed. A reported HTTP 555 from the token endpoint is treated as a gateway failure. By default the client retries selected transient 5xx responses once after two seconds, with 15-second request timeouts. Rate limits, invalid credentials, confirmation failures and timeouts are reported without an automatic retry. NoRetry disables the single retry for correlating a diagnostic run with gateway logs.

For one verification-only run, omit BindReviewedManagers and run:

```powershell
& 'C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review\scripts\Bind-UraniusSyntheticManagers.ps1' -NoRetry
```

Use the Uranius publishable key and existing manager passwords only in the private terminal. No database client or CA file is required in this mode. Report only the sanitized status, classification and request ID, or the aggregate success message. Verification signs each confirmed account out and does not bind ownership.

## Independent Node verification and credential-preserving fallback

Run once in a private Windows terminal from the sanitized checkout:

```powershell
Set-Location 'C:\Users\Aleks\Desktop\Project-Uranius\.uranius-upload-review'
node scripts/verify-uranius-auth.mjs
```

Enter the Uranius publishable key and existing passwords only at the hidden prompts. The official SDK verifies and signs out Manager A before prompting for B. The script preserves password characters and whitespace, stores sessions only in memory, and makes one request per Auth phase with a deadline. It reports only sanitized phase/status/category/request ID or aggregate success. It cannot bind ownership or call any database endpoint. If A fails, the script stops before asking for B's password.

A native PowerShell 5.1 loopback test reproduced corruption of a non-ASCII password when a JSON string was posted with application/json and no explicit UTF-8 encoding. The PowerShell binding verifier now sends UTF-8 bytes with the charset, verified against the same local HTTP receiver. That defect explains failures for passwords affected by the encoding. The hosted password contents and whether this caused the reported incident remain unverified. If both Node checks pass, use the repaired PowerShell verifier only when the separate ownership-binding step is authorized. [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)

If the official SDK still reports invalid credentials, stop. Compare the actual confirmed account's email against its expected slot, verify the exact project, then correlate the request ID in Uranius Auth logs. A stored hash alone does not establish that the entered password matches it. A password update remains on hold. If separately authorized after the investigation, use a project-only server-side Auth Admin client outside the browser. Resolve the existing account through Admin getUserById and compare the exact UUID, confirmed email and intended slot. Prompt for and confirm the new password locally, then call admin.updateUserById(existingUuid, { password: newPassword }) for that account only. Re-read the same UUID and verify sign-in once via the independent script. Do not recreate users, reset via email or write auth.users directly. Leave any undisclosed project secret in protected local memory. [Supabase Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
