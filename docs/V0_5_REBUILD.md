# StudioDesk V0.5 — Identity, Operations & Liquid UI rebuild

## Core corrections
- Multi-role accounts: one Firebase identity can be Client + Worker + Finance + Manager etc.
- Workspace switching for genuine multiple roles; owner preview modes remain separate.
- Account approval no longer freezes a person into one role. Owners/admins can promote, remove roles, suspend/reactivate, and set a default workspace later.
- Client linking can match/create a client record by email; linking backfills project access so linked clients see assigned projects.
- Existing-client projects automatically inherit linked client portal user IDs.
- Same-name people are distinguished using email and Firebase UID; names are display labels only.

## Worker operations
Workers/designers/project managers can create projects and clients, create/assign tasks, moodboards and previews, and prepare draft contracts/invoices for projects they manage. Finance/Admin/Owner remain the final gate for issued invoices, payment verification, and non-draft commercial statuses.

## Finance
- Dedicated Finance workspace.
- Draft invoice lifecycle: Draft -> Sent -> Partially Paid -> Paid / Void.
- Draft invoices stay private and are not counted as receivables.
- Draft amounts can be edited before sending without changing project contract value.
- Issued invoices become client-visible; payment verification remains a separate event.
- Contracts, invoices and payments remain separate from the project agreed value.

## Profile & authentication
- Device image picker for profile photos; images are compressed client-side and stored as a small profile value (no heavy Firebase Storage upload).
- Show/Hide password controls on sign-in and sign-up.
- Confirm-password field on sign-up.
- Existing Forgot Password flow retained.

## UI
- Space Grotesk remains the brand font.
- Stronger type hierarchy and clearer weights.
- Dark mode changed from static sleepy gradients to a subtle animated liquid/aurora background using mint and cyan motion.
- Reduced-motion accessibility support included.
