# StudioDesk V0.6 Deployment Checklist

1. Back up the currently deployed V0.5 branch/ZIP.
2. Commit the complete V0.6 folder together; do not deploy only `app.js`.
3. Deploy `firestore.rules`.
4. Deploy `firestore.indexes.json`. Two V0.6 client-visibility indexes are included for contracts and moodboard items.
5. Deploy Hosting.
6. Wait for deployment success.
7. Open StudioDesk in a fresh/private browser first and verify Owner login.
8. Hard-refresh the normal browser/PWA so service worker cache `studiodesk-v0.6.0` replaces V0.5.
9. Run the acceptance sequence in `docs/V0_6_REBUILD.md`.
10. Test at least one Owner/Admin, Worker/Designer, Finance and Client account.
11. Test one multi-role account by switching workspaces and confirm each workspace re-subscribes to only the data needed for that role.

## Important
Deploying only the UI without the matching V0.6 Firestore rules can create confusing permission failures. Deploy rules/indexes and the UI as one release.
