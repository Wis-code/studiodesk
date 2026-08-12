# StudioDesk V0.6 — Liquid Operations Rebuild

## Build principle

Anything that can be created in StudioDesk should have the appropriate lifecycle around it: View → Edit → Assign/Reassign or Link/Unlink → State transition → Archive/Void → Delete only when safe. The visible controls and Firestore Security Rules should agree.

## Acceptance-oriented changes

### Projects and assignments
- Direct project creation does not require a branding package.
- Project agreed value is the canonical current project commercial value; legacy `totalValue` is read only as a fallback for older records.
- Edit project includes client, status, deadline, scope, agreed value, managers and workers.
- Team assignment supports add/remove/replace/unassigned.
- Removing a worker/manager from a project also removes them from task assignments on that project.
- Owner may permanently delete disposable/test projects; financial/legal history blocks normal deletion.

### Tasks
- Multiple assignees.
- Full manager controls for title/details/deadline/priority/status/assignment.
- Assigned workers can update their operational status/blocker fields.
- Complete/reopen, archive/restore, and safe delete are visible in-app.

### Clients and identities
- One Firebase identity can hold multiple StudioDesk roles.
- Approval does not freeze roles.
- Client portal link/unlink uses UID/client ID rather than names.
- Workers may manage client records they created; managers/admins manage the shared directory.
- Same-name people remain distinct by UID/email.
- Profile changes have a live self-profile listener.

### Finance
- Draft invoices are private and do not count as receivables.
- Issued invoices are historical records: revise/supersede/void rather than rewrite.
- Verified payment updates invoice balance in a Firestore transaction.
- Expense drafts can be edited/deleted; recorded expenses are voided, not erased.
- Firestore rules protect issued invoice/payment/expense history, not just the buttons.

### Contracts
- Drafts remain editable.
- Finalized agreements are not editable in place.
- Archive/restore preserves the agreement record.
- Void preserves history and reason.

### Creative workspace
- Moodboards can be edited/deleted.
- References can be edited, removed and reordered.
- Changing board client visibility propagates to reference visibility.
- Client Firestore subscriptions/rules only expose client-visible boards/references/previews.

### Mobile and motion
- Small screens use stacked cards and bottom sheets.
- Horizontal scrolling is reserved for intentional navigation/filter areas.
- Slow fluid background layers and glass depth retain the bold V0.5 direction.
- Buttons have highlight sweeps, hover lift, touch press scale and optional breathing emphasis.
- Reduced-motion preference disables nonessential animation.

### Orientation
- No permanent Tutorial/Academy navigation or Settings replay.
- Only newly created StudioDesk profiles receive orientation.
- Completing it writes `onboardingComplete=true` and `onboardingEligible=false`.
- Existing users without the V0.6 eligibility flag are not interrupted.

## Acceptance test sequence

Test at minimum on desktop and a phone:

1. Create a project with an existing client; edit the value/client/deadline.
2. Assign two workers; remove one; replace them; leave production unassigned; reassign.
3. Create a task; multi-assign; unassign; edit; block; complete; reopen; archive; restore; delete.
4. Create a draft invoice; change amount; confirm it does not count as outstanding; issue it.
5. Create a revision draft; confirm the original stays active until revision issuance.
6. Submit and verify a payment; confirm invoice balance updates immediately.
7. Create/edit/delete a draft expense; create another, record it, then void it and confirm history remains.
8. Create/edit a draft contract; finalize; confirm it cannot be silently edited; archive/restore or void it.
9. Create a moodboard; add/reorder/remove references; toggle client visibility.
10. Upload/change/remove profile photo and confirm avatar changes immediately.
11. Link a Client role account to a client record and verify visible projects/invoices/previews.
12. Mark a disposable project as test and run Owner test-data cleanup.
13. Create a brand-new account and complete orientation; sign out/in and verify the tutorial never returns.
14. Give one account both Worker + Client roles; switch to Worker and confirm operational tasks/drafts are available, then switch to Client and confirm internal tasks/drafts/internal moodboards disappear. Switch back and confirm Worker data returns.
