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
