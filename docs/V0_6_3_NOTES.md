# StudioDesk V0.6.3

Focused repair release.

- Rebuilt generated PDF layout with Wiscode navy/mint header, structured metadata cards, real table rows, emphasized totals and cleaner footer.
- Receipt payment method labels are human-readable.
- Added Settings → Test notification so browser reminder permission can be verified immediately.
- Keeps the V0.6.2 Blob-based document/share pipeline.

## Notification test
1. Open Settings → Appearance & reminders.
2. Click Enable work reminders and allow browser notifications.
3. Click Test notification.
4. A system notification titled “StudioDesk — test reminder” should appear.

Browser reminders in this build require StudioDesk to be running. Closed-app push still requires FCM/backend scheduling.
