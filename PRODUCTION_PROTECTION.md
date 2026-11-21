# Production protection

Project Uranius starts as a local offline lab. The approved GitHub review destination is bracko87/Project-Uranius. Its public setting and disabled Actions were verified by a read-only GET. Publication needs explicit owner approval.

| Resource | Boundary | Approved identifier today |
|---|---|---|
| Database and RPC | Future dedicated project with separate roles, access policies and credentials | None |
| Auth | Dedicated sandbox tenants, synthetic accounts and exact callback allowlist for the private site | None |
| Storage | Dedicated buckets, sandbox-only policies and approved assets | None |
| Workers and jobs | Future sandbox deployment, explicit worker identities and separately enabled sandbox schedules | None |
| Website | Future separate private test site, with its own identity, auth redirect and environment | None |
| Integrations and logs | Isolated analytics and logs if approved, with email, payment, webhooks and production telemetry disabled | None |

## Target verification

The authorized target list is empty for database and hosting. Record the exact owner-approved project ref, origin, and hosting site ID before any networked sandbox operation. Validate each operation's target against the recorded values and require exact origin matching. Verify that expected RPC, Auth and Storage endpoints use the same sandbox project. Resolve credentials inside the scoped sandbox process and keep them out of Git, URLs, manifests and logs.

Require explicit approval for each deployment path and require an independent post-deployment identity check when sandbox deployment is eventually authorized. Use the offline fixture engine and checked-in placeholder assets at this milestone. Start later sandbox tests with synthetic data, separate auth and Storage policies, access restrictions, and disabled schedules. Retain outbound email, cron, webhook and payment opt-in gates.

## Budget authorization

The approved incremental infrastructure cap is zero. Milestone 4 is the planned review gate before paid infrastructure is considered. At that point, document actual eligibility, projected monthly compute, storage, egress and tax in the selected account, and request owner approval before any paid provisioning. There is no active database, site, worker or scheduled job provisioned by this project.

## Local preflight

Run node scripts/assert-sandbox-target.mjs with deploy, migrate, or admin to check the operation's target before any future authorized privileged operation. The guard matches the recorded project ref and canonical origin and checks the site ID for deploy. Its approved target constants are empty, so every privileged operation is denied today. The preflight reads identity settings only and does not connect to a service.
