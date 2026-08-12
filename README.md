# StudioDesk

StudioDesk is Wiscode Studio's creative-operations system for projects, clients, workers, tasks, research/moodboards, protected reviews, contracts, finance, delivery and portfolio history.

## V0.4 acceptance rebuild
The live V0.3 prototype proved Firebase connectivity and the visual direction, but acceptance testing exposed a workflow problem: too much of the app revolved around a branding Package Builder. V0.4 corrects that architecture.

### Key model
`Project` is the operating object. Services, package templates, contracts, invoices, moodboards, tasks and delivery are tools attached to a project when needed.

A project can start from:
1. an already agreed external quote,
2. the service catalogue,
3. a reusable package template,
4. a custom commercial contract.

### Roles
Owner/Admin, Project Manager/Lead Designer, Designer/Worker, Finance and Client. New registrations are pending until approved by an Owner/Admin.

### Firebase
- Project: `studiodesk-20dc6`
- Firestore: `(default)` in `africa-south1`
- Hosting: Firebase Hosting
- Heavy files: Google Drive links/integration boundary

### Deployment
Publish the matching `firestore.rules` before testing the new self-registration/approval flows. Then deploy Hosting.

```bash
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

Do not commit service-account keys, billing/card data, passwords, OAuth client secrets or trusted mail provider secrets.
