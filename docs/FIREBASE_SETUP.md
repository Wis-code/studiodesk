# StudioDesk Firebase Setup — Spark / No Billing Account

## 1. Create a dedicated Firebase project
Create a new Firebase project for StudioDesk. Keep it separate from RecoveryDesk.
Recommended project display name: `StudioDesk`.
Choose a unique project ID (for example `wiscode-studiodesk`, if available).
Google Analytics is optional for V1 and can be left off.

## 2. Register the Web app
From Project Overview, add a Web app.
Recommended app nickname: `StudioDesk Web`.
Do not enable App Hosting. StudioDesk V1 uses classic Firebase Hosting.
Copy the Firebase configuration object exactly as generated.

## 3. Paste the web config
Open `config/firebase-config.js` and paste the generated values into:
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_PROJECT_ID
- FIREBASE_APP_ID
- FIREBASE_MESSAGING_SENDER_ID

Firebase's web config identifiers are not secrets. Never paste a service-account private key into browser code.

## 4. Enable Authentication
Firebase Console → Authentication → Get started → Sign-in method.
Enable:
- Email/Password
- Anonymous (used invisibly when a public visitor submits a package request)

Do not enable Phone/SMS authentication for V1.

## 5. Create Firestore
Firebase Console → Databases & Storage → Firestore → Create database.
Choose Standard edition and an appropriate region.
Start in **Production mode** because StudioDesk already includes its own rules file. Do not leave a real project on open test rules.

## 6. Deploy the StudioDesk rules and indexes
Install/login to the Firebase CLI, then from the StudioDesk folder:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

When prompted by `firebase use --add`, choose the new StudioDesk project.

## 7. Create the first Owner account
Firebase Console → Authentication → Users → Add user.
Create the owner using the email/password you want for StudioDesk.
Copy the generated UID.

Then Firestore → `users` collection → create a document whose document ID is that exact UID:

```json
{
  "displayName": "Wisdom",
  "role": "owner",
  "active": true,
  "createdAt": "use a Firestore timestamp"
}
```

The first owner profile is intentionally bootstrapped manually. After the Owner administration screens are connected, StudioDesk can manage normal role/profile records through its UI.

## 8. Seed the published package catalog later
The public package builder will eventually read sanitized pricing/output records from `catalogAssets`.
Internal process standards stay in `standards` and are never publicly readable.

Example `catalogAssets/business-card`:

```json
{
  "name": "Business Card",
  "description": "Business card application within the selected identity system.",
  "pricingMode": "fixed",
  "price": 20000,
  "published": true,
  "sortOrder": 20
}
```

## 9. Firebase Hosting
From the project folder:

```bash
firebase deploy --only hosting
```

No Cloud Functions and no Firebase Storage are included in this setup.

## Security model in this build
- Internal standards are signed-in only.
- Public configurator reads only sanitized `catalogAssets`.
- Public package-request submission uses invisible Anonymous Auth and is create-only.
- Project data requires explicit `accessUserIds` membership, except Owner/Admin.
- Management mutations require Owner/Admin or an assigned project manager/lead.
- Finance writes require Owner/Admin/Finance.
- Past-work/portfolio records use explicit `authorizedUserIds`.
- Audit/activity records are append-only from the client application.

## Important
Firestore Security Rules are the enforcement boundary. Hiding a button in the UI is never treated as authorization.
