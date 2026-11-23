# Blockers

## U1.02 resolved

The authorized GitHub checks confirmed the public destination and disabled Actions. See TEST_REPORT.md.

## Proposed upload review

1. Verify the destination owner and repository identity, its public visibility, saved Actions setting and deployment integration settings during the authorized review.
2. Build a separate export from a reviewed file manifest. Preserve lockfiles and required assets. Exclude inherited Git metadata, credentials, CLI state, production data and private fixtures. Preserve necessary schema logic for review while excluding executable production schedules and callbacks.
3. Scan the exact export for secret formats, personal data, dumps, device and configuration metadata, and outbound targets. Reconcile all exclusions and changes with the pinned source manifest. Verify that production execution paths are disabled, workers use isolated dependencies and missing or wrong sandbox configuration fails closed.
4. Initialize a new repository from that reviewed export. Verify that its root commit has no parents and its tree matches the reviewed manifest. Keep the local evidence repository outside that export.
5. Present the manifest, scan results, destination checks and root commit for owner review. Add the verified destination and publish only after explicit approval.

## Missing pinned worker source — resolved

The five direct files and seven relative dependencies at the three authorized pins were recovered. The draft contains content and blob provenance under reference/engine-pins. See TEST_REPORT.md.

## U1.03 — Missing visual assets resolved

The owner authorized local placeholders. ASSET_REPLACEMENT_REGISTER.md records each replacement. Existing tracked artwork was retained where available.

## U1.03 — Historical fixture disposition resolved

The owner authorized anonymization or quarantine. Numerical inputs were preserved in the attempted transform, but historical sporting equivalence remains unverified after the dependent test run. The affected historic files remain outside the export, with two verified synthetic replacement tests in the staged source. See TEST_REPORT.md.

## Upload preflight resolved

The owner confirmed the Netlify repository access configuration and authorized upload of the exact approved root. GitHub independently confirmed disabled Actions, no Pages, zero webhooks, deployments and environments, and zero refs before the push. Installed App inventory was unavailable to the token. No Netlify access or deployment was used. The published main initially matched the approved root exactly. This checkout is the sole development workspace. The inherited checkout is read-only provenance.

## U3.08 — Chase and follow rule approval

R03 requires approval for live controls beyond attack. The selected existing_v1 effect executor ignores every non-attack TeamOrder. The available flat-stage chase effort function is a group-level bonus and supplies neither a rider's target or eligibility rules nor a follow lifecycle. Reusing it for a live order requires a sporting decision about who can initiate or join the pursuit, how long the order lasts, and which actions can affect group pace.

Proposed scope for approval: a manager may tell an eligible owned rider already in a chase group to pursue a designated group ahead, using the existing flat-stage pace and energy calculations. Follow may target a rider in the same group and attempts that rider's next eligible move through existing movement and energy rules. Use no position jump or guaranteed catch. Existing terrain restrictions apply. U3.09 through U3.12 remain pending in order.

U3.08 was resolved by the owner approving pursuit and follow rules. Flat-stage chase uses the existing chase pace cap and energy formula. Follow attempts the target's next supported tactical movement, currently an attack, and uses simulated pace before choosing whether to leave the source group.

## U5.01 ? Paid sandbox authorization pending

Approve one standalone Supabase Micro project in the existing paid Pro organization in Frankfurt at approximately $10/month incremental before tax. See INFRASTRUCTURE_PLAN.md for the exact hourly rate, shared quota headroom and isolation safeguards. The owner must confirm the dashboard billing estimate and available shared quota before any charge. After provisioning is authorized, independently verify the organization, project ref, origin, region, owner access and separate credentials before enabling the target guard. U5.02 remains pending.

## U5.01 - Final offline review pending

The owner confirmed the $10/month Micro base charge before tax and usage overages and explicitly withheld provisioning authorization. The initial migration and synthetic reference tranche is rehearsed locally. Hosted project identity, owner access, exact aggregate quota headroom and platform security checks remain pending until approval. The 18 Vitest failures reproduce at the sanitized root. Preserve the quarantined production worker dependency and track the remaining legacy coverage in TEST_REPORT.md. Further schema reconciliation and hosted application remain U5.02 onward.

## U5.02 - First sandbox write needs authorization

The owner-provisioned target sdtsivgtcaoaeoihcwzd passed scoped read-only identity and empty-catalog verification. This resolves the U5.01 provisioning blocker. Approval is required to create the dedicated migration role and apply the exact four-file manifest to this project. The local Windows environment also needs a trusted psql client and the project's CA and dedicated migration credential supplied via local secure settings. Never send these credentials in chat or commit them. U5.02 remains blocked at the first write.

## U5.02 - First-write scope approved, connection prerequisites pending

The owner authorized the dedicated role and four reviewed files for sdtsivgtcaoaeoihcwzd. Read-only metadata and catalog verification passed. The local session has no Uranius DBA or migration DSN, no project CA configured and no psql found on PATH or in the standard installation directory. The hosted TLS certificate and login could therefore not be verified. Provide project-only access through secure local settings. Do not share secret values in chat or Git.

## U5.02 - Local password entry pending

The portable client and verify-full connection to the exact Uranius host now work. The owner must enter the Uranius-only database password and choose the distinct migration-role password in the private Windows terminal. See the Windows interactive connection section in INFRASTRUCTURE_PLAN.md. No credentials are needed in chat. If the connection script reports a failure, inspect role and ledger state before any retry.

## U5.02 - Revised manifest awaiting approval

The existing restricted hosted role is retained. The owner reports no application tables and no committed migrations. The original numbered files fail the restricted-role rehearsal at the managed Auth dependency. The replacement manifest is rehearsed offline and requires explicit approval before any remote write. See INFRASTRUCTURE_PLAN.md for the exact digest and resume procedure.

## U5.02 - Foundation applied, remaining reconstruction requires review

The owner completed initialization and live read-only verification passed for the four-file foundation. U5.02 remains blocked on reconciliation of the retained app contracts, review of missing source dependencies and approval of any additional pinned migrations. See reference/DB_DRIFT_AUDIT.md. U5.03 synthetic world preparation is available offline. Hosted seed/login work follows the U5.02 gate.

## U5.02 - Reviewed club identity package pending approval

Migration 005 is ready for owner review. The package adds the initial read-only game club contract and private-table RLS hardening. No remote writes or API exposure were performed. Approve only the exact manifest and target in database/reconstruction/README.md. Remaining reconstruction work is tracked in reference/DB_RECONSTRUCTION_PLAN.md. U5.03 requires separately authorized account creation and seed import after the dependent contracts are ready.
