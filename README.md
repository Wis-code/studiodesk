# StudioDesk

StudioDesk is the creative-operations workspace for Wiscode Studio / Wiscode Innovations Limited. It connects clients, projects, assignments, tasks, creative research, protected previews, contracts, invoices, payments, expenses, delivery and people in one role-aware system.

## Current build — V0.6 Liquid Operations

V0.6 is an architecture and interaction pass, not a cosmetic patch. The build keeps the bold V0.5 direction, adds a restrained fluid/liquid feel and animated controls, and completes more of the record lifecycles that were previously one-way.

### What changed

- **Projects are independent work records.** Packages/services are optional helpers. Owner/administrators and authorized project managers can edit the client, agreed value, status, deadline, scope and team assignments.
- **Assignments are reversible.** Project managers/workers can be added, removed or replaced; leaving the worker selection empty produces an explicit unassigned project. Removed project users are also removed from linked task assignments.
- **Tasks support a real lifecycle.** Create, open, edit, multi-assign, unassign, reassign, block, complete, reopen, archive/restore and delete according to project permissions.
- **Clients are managed inside StudioDesk.** Managers/admins can edit/archive records; workers can edit clients they created. Owner can delete only when project history no longer references the client.
- **Multi-role identities remain one account.** Roles can be changed after approval, workspaces can be switched, client records can be linked/unlinked, and suspended accounts remain visible for reactivation. Switching a non-owner workspace now tears down the old live subscription and re-subscribes using the selected role, preventing Worker drafts/tasks from bleeding into the Client workspace.
- **Profiles update live.** Name/title/contact/photo changes patch local state immediately and the signed-in profile also has a live Firestore listener.
- **Invoices have protected history.** Drafts are private/editable/deletable. Issued invoices enter receivables. Issued records are revised, superseded or voided instead of silently rewritten. Paid/partially-paid invoices cannot be replaced by revision.
- **Payments are verified transactionally.** Verification updates payment and invoice balances together and refuses overpayment against the current invoice balance.
- **Expenses now have a financial lifecycle.** Finance/Admin creates editable drafts, records confirmed expenses, and voids recorded entries rather than deleting financial history.
- **Contracts preserve history.** Drafts are editable/deletable; finalized agreements can be archived/restored or voided, not silently rewritten.
- **Moodboards and previews have revision controls.** References can be edited, removed and reordered; board visibility propagates to its references; client queries/rules only expose client-visible creative material.
- **Services, categories, workflow standards and package templates have safe management controls.** Referenced records refuse unsafe deletion.
- **Owner test-data cleanup** removes records explicitly marked as test data plus linked disposable project records with typed confirmation.
- **Mobile is a real layout.** Projects, finance, contracts, tasks, clients and modals stack into phone-friendly cards/sheets rather than behaving like squeezed desktop tables.
- **Errors are visible.** Failed writes surface an error toast instead of allowing a button to look successful.
- **UI and Firestore rules are aligned more closely.** Sensitive issued invoices, verified payments, finalized contracts and recorded expenses are protected at the database-rule layer too.

### V0.6 interaction direction

The interface keeps Space Grotesk, stronger typography and the bold V0.5 visual language. The dark workspace now has slow liquid depth layers, glassy surfaces, responsive water-like highlights and animated button sheen/press feedback. Motion honors `prefers-reduced-motion`.

### One-time orientation

There is **no permanent Academy/tutorial section** in V0.6.

Only profiles created as new StudioDesk registrations receive the first-registration orientation. When the user finishes it, Firestore records the completion and the orientation is not offered again. Existing pre-V0.6 users are not forced through it.

## Infrastructure

- Firebase project: `studiodesk-20dc6`
- Firestore production database: `(default)` in `africa-south1`
- Firebase Hosting: `studiodesk-20dc6.web.app`
- Heavy creative files: external/Google Drive links; profile images are compressed for the profile record
- Payment gateway: not connected; V0.6 uses manual payment submission + Finance/Admin verification
- Automatic transactional email provider: not connected in this static build

## Deployment order

Deploy the matching V0.6 rules/indexes and app together:

```bash
cd ~/studiodesk
git pull origin main
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only hosting
```

After deployment, hard-refresh once so the `studiodesk-v0.6.0` service-worker cache replaces V0.5.

## Security

Never commit service-account keys, passwords, billing/card details, OAuth secrets or private API credentials. Firebase Web configuration is frontend project-identifying configuration; authorization is enforced through Firebase Authentication and Firestore Security Rules.
