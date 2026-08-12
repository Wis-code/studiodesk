# StudioDesk V0.5 Deployment Checklist

1. Keep `backup-v0.3` untouched as the rollback branch.
2. Upload/replace the V0.5 files on GitHub `main` and commit them together.
3. In Google Cloud Shell:
   ```bash
   cd ~/studiodesk
   git pull origin main
   node --check app.js
   ```
4. Deploy the updated Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```
6. Deploy the site:
   ```bash
   firebase deploy --only hosting
   ```
7. Reload StudioDesk. The service-worker cache is `studiodesk-v0.5.0`.
8. Acceptance test in this order:
   - Owner profile picture and password visibility.
   - Manage an existing account and add two real roles (e.g. Worker + Client or Worker + Finance).
   - Sign out/in and verify the workspace chooser.
   - Link/create a client by email and assign a project; verify it appears in the client portal.
   - Worker creates/operates an assigned project, task, moodboard, draft contract and draft invoice.
   - Finance/Admin issues the invoice; verify drafts are not client-visible or counted as receivables.
   - Client sees the issued invoice, submits payment, Finance verifies it.
   - Confirm Services/Package administration is restricted to Admin/Owner workspaces.
