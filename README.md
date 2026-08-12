# StudioDesk

StudioDesk is the creative-operations workspace for Wiscode Studio / Wiscode Innovations Limited. It manages projects, clients, workers, creative workflows, moodboards, protected review, contracts, invoices, payments, delivery, past work and portfolio records in one connected system.

## Current build — V0.5 Identity & Operations Rebuild

V0.5 is an acceptance-stage rebuild focused on real studio operations rather than a branding-only package configurator.

### Core changes
- One identity can hold multiple roles and switch real workspaces: Client, Worker/Designer, Project Manager, Finance, Admin and Owner.
- Approval activates an account; roles remain editable later so people can be promoted, demoted or given additional roles without creating another email account.
- Client login identities are linked to client records by UID/email and linked projects are backfilled for portal visibility.
- Workers/designers can operate assigned work: create projects/clients/tasks, moodboards, protected previews, draft contracts and draft invoices.
- Finance/Admin/Owner handle sensitive finalization such as issuing invoices, verifying payments and finalizing commercial documents.
- Draft invoices remain editable and private; only issued invoices become receivables/client-visible.
- Project agreed/contract value is separate from invoice values and milestone billing.
- Profile pictures can be chosen from the device and compressed into the user profile without Firebase Storage.
- Password fields support visibility toggles; Firebase password reset remains available.
- Space Grotesk is the brand typeface with stronger typographic hierarchy.
- Dark mode uses a restrained liquid/organic motion system rather than a static heavy gradient.
- Role-aware route guards keep sensitive administration pages out of the wrong workspace.

## Infrastructure
- Firebase project: `studiodesk-20dc6`
- Firestore production database: `(default)` in `africa-south1`
- Firebase Hosting: `studiodesk-20dc6.web.app`
- Heavy creative files: Google Drive boundary; Firestore stores metadata/links
- Payment gateway: deferred; V1 uses manual payment records and verification

## Deployment order
When this build is committed to GitHub, deploy from Google Cloud Shell:

```bash
cd ~/studiodesk
git pull origin main
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only hosting
```

If Firestore reports that indexes are already present, that is fine. Test Owner, Worker, Client and Finance workspaces after deployment.

## Security
Never commit service-account keys, passwords, billing/card details, OAuth secrets or private API credentials. Firebase Web configuration is frontend project-identifying configuration; authorization is enforced through Firebase Authentication and Firestore Security Rules.
