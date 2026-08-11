# StudioDesk

StudioDesk is Wiscode Studio's design-business operating system: project intake, shoppable creative assets, diagnostic workflows, worker assignments, protected client review, finance, delivery gates, past-work archives and portfolio contribution tracking.

## Current build: v0.3 live foundation

This build is wired to the Firebase project `studiodesk-20dc6` and uses the `(default)` Cloud Firestore database created in `africa-south1`.

### Working now

- Premium responsive StudioDesk UI using the uploaded navy/mint brand mark.
- Public package configurator with no visible sign-in required.
- Firebase Email/Password and Google authentication.
- Owner profile lookup through `users/{uid}`.
- Live Firestore owner workspace subscriptions.
- First-run seeding for editable standards and unpublished catalogue assets.
- Live asset-price editing and publish toggles.
- Fixed creative foundation + shoppable outputs.
- Dependency-aware diagnostic engine with task deduplication.
- Dynamic one-page/full Brand Guidelines eligibility.
- Project creation that generates project tasks automatically.
- Client records created with projects.
- Manual invoice creation and payment recording.
- Project/past-work architecture.
- Worker/client role-aware navigation foundation.
- Studio business settings and CAC/legal profile placeholder.
- PWA manifest/service worker.

### Deliberately not enabled yet

- Payment gateway. V1 records/verifies bank transfers manually.
- Firebase Storage for heavy creative files. Google Drive is the intended asset store.
- Automatic email sending. The UI/data architecture is ready for a later mail adapter/Cloud Function.
- Worker self-invite/signup flow. Until that is implemented, worker Auth accounts are bootstrapped manually.
- Google Drive OAuth. The data model is prepared, but the OAuth/client integration is not wired in this build.
- Clean final-delivery automation. Release-gate state exists, but Drive package release is a later integration tranche.

## Firebase

Project: `studiodesk-20dc6`

The Firebase Web config lives in `config/firebase-config.js`. Firebase Web API keys are client configuration identifiers; never add service-account JSON files, OAuth client secrets, card details or private keys to this repository.

### Deploy Firestore rules/indexes

The repository includes the expanded production rules in `firestore.rules`. Your currently published console rules are intentionally owner-only bootstrap rules. When ready to test workers/clients/public package requests, deploy the repository rules:

```bash
firebase login
firebase use studiodesk-20dc6
firebase deploy --only firestore:rules,firestore:indexes
```

### Deploy Hosting

```bash
firebase deploy --only hosting
```

## First live owner run

1. Sign in with the Firebase Auth account whose Firestore user profile has `role: "owner"` and `status: "active"`.
2. On the dashboard, choose **Initialize workspace**.
3. Open **Standards & Pricing**.
4. Review every starter price before publishing any public asset.
5. Open **Settings** and set the actual fixed creative-foundation price and deposit rate.
6. Create a test project from **Package Builder**.
7. Confirm the project, client and generated tasks appear in Firestore.

## Repository safety

`.gitignore` excludes environment files, Firebase local cache, logs and private-key/service-account file patterns. Never commit billing credentials or Google service-account secrets.
