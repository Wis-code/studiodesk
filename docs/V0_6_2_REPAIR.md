# StudioDesk V0.6.2 — Document & UX Repair

Focused repair release.

- Replaced about:blank document writes with Blob-backed document previews.
- Added generated PDF download and Web Share file support for compatible devices.
- Invoice, receipt, service list, contract and finance report use the same document engine.
- Added contract PDF/share controls.
- Firestore/profile connection failures now show a retry state instead of incorrectly suggesting the profile is missing.
- Strengthened profile-photo cover/crop behavior across avatars.
- Rebalanced light mode around Wiscode white (#FDFFFE), dark (#242E3D) and mint (#66FFCC).
- Notification copy now accurately describes the current browser-reminder limitation.

No Firestore schema/rule changes are required for this repair release.
