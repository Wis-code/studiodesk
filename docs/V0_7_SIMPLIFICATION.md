# StudioDesk V0.7 — internal workspace

Daily navigation is Home, Projects, Clients and Finance. Team management and service pricing are accessed through Settings. Project tabs are Overview, Tasks, Creative, Money and Notes.

Client-only accounts see a paused-access screen. Accounts with both internal and client roles default to an internal role. Public service browsing, client signup, portfolio, review and package routes are no longer active entry points. Existing records, role grants, Firestore rules and financial services are preserved; this is a UI simplification, not a security/data migration.

New projects require a name and an existing or new client, with deadline, agreed amount, currency and scope. Assignments remain available through project editing. Notes are stored as internalNotes and are editable by project managers/administrators under existing project permissions. Browser reminders retain their existing limitations; no closed-app reminder backend is introduced.

Home shows active projects, tasks due today/overdue, outstanding issued invoices grouped by currency, overdue invoices and payments requiring verification. Draft invoices and completed tasks are excluded from attention alerts.

Gradients, decorative animations, shadows and backdrop effects have been removed. Light/dark preferences remain. The service-worker cache version is updated.

Validation: node tests/workspace-smoke.cjs; node --input-type=module --check < app.js. Financial document generation and services/firestore.js are unchanged. Authenticated live Firebase and visual browser checks are still required before production deployment.
