# StudioDesk V0.6.1 — UI correction pass

This build starts from the working StudioDesk V0.6 repository ZIP supplied after the line-129 syntax correction. The existing operational architecture, Firestore rules, services and data model are preserved.

## Changes in V0.6.1

- Added a real Light / Dark theme switch in the top bar, profile menu and Settings.
- Theme defaults to the device preference for a new browser, saves immediately in local storage, so the preference returns when StudioDesk is reopened on that device.
- Light mode deliberately keeps dark navy as a secondary brand colour: sidebar/navigation, dark actions and structural accents stay recognizably StudioDesk while the workspace becomes warm/light.
- Profile images now use centered `object-fit: cover` cropping in circular avatar frames. Square, portrait and landscape source images no longer stretch inside avatar circles. Worker-card avatars use the same crop behavior; ID-card photos remain a purposeful rounded rectangle but also crop correctly.
- Project detail was rebuilt at the CSS/layout boundary for Android widths: no page-level horizontal overflow, stacked title/actions, swipeable project tabs, responsive summary cards, safe word wrapping and full-width task/panel content.
- Button feedback is performance-first: fast press compression, lightweight theme button feedback and visible busy spinners for async writes. The action starts immediately; animation never gates the write.
- Mobile performance reduces expensive backdrop filters and one full-screen animated liquid blob while retaining the liquid identity.
- Existing one-time registration orientation remains unchanged: it is not a permanent Tutorial/Academy section.

## Acceptance checks

1. Open StudioDesk on Android and a laptop. Confirm there is no horizontal page overflow in an open Project.
2. In a Project, swipe the Overview / Tasks / Research / Commercial / Reviews / Delivery tab row horizontally on a narrow phone.
3. Confirm project action buttons stack cleanly and summary cards become 2-column, then 1-column on very narrow screens.
4. Toggle Light/Dark from the top bar and Settings. Reload. Confirm the choice persists.
5. In Light mode confirm the main workspace is light while dark navy remains visible in sidebar/navigation and dark secondary controls.
6. Upload a square profile photo. Confirm Settings preview, top avatar, profile menu and Team avatar crop to a circle without distortion.
7. Tap save/create controls. Confirm immediate press feedback and a small busy indicator during Firestore writes.
8. Confirm existing V0.6 project/task/invoice/client workflows still work; V0.6.1 intentionally does not change their data lifecycle.

## Deployment

From the existing Cloud Shell repository after committing V0.6.1 to GitHub:

```bash
cd ~/studiodesk
git pull origin main
firebase deploy --only hosting
```

Firestore rules/indexes were not changed by this UI correction pass. If you intentionally changed them separately in GitHub, deploy those separately as well.

After Hosting deploys, hard-refresh/reopen the PWA so the `studiodesk-v0.6.1-ui-1` service-worker cache replaces the previous shell.
