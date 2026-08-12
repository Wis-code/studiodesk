# StudioDesk V0.4 Structural Rebuild

This release rebuilds the workflow architecture after live acceptance testing.

## Core corrections
- Projects are first-class. A project no longer has to begin in Package Builder.
- Commercial routes are explicit: already quoted, service catalogue, package template, or custom contract.
- Already-agreed prices are not recalculated by service selection.
- Logo System is no longer globally mandatory.
- Services & Pricing is a general studio catalogue, not a branding-only catalogue.
- Owners can create categories, services, reusable package templates, and editable workflow standards.
- Package templates are optional quoting tools.
- Contracts are first-class records with milestone support and external signed-document links.
- Payments are submitted first and explicitly verified by authorized finance/owner roles.
- Research & Moodboard is a project workspace with references, notes, visibility, and Print/Save-PDF presentation flow.
- New worker/client accounts can self-register but remain pending until owner/admin approval.
- Team approval assigns actual roles; client accounts can be linked to existing client records.
- Owner has an explicit role-preview switcher for testing Worker and Client UI without changing permissions.
- Sign out is visible in both the profile menu and Settings.
- Worker profile cards and printable worker ID cards are included.
- Role-aware guided onboarding is mandatory on first active visit and replayable in Academy/Settings.
- Mobile navigation is Home / Projects / Tasks-or-role-primary / Clients-or-role-primary / More.
- Space Grotesk is the brand typeface. Hierarchy now uses scale, weight, spacing, contrast and surface treatment instead of one flat type size.

## Security / limitations
- Protected previews use watermarking and restricted UI, but no browser can technically prevent a user from taking a device screenshot.
- Heavy design files should remain in Google Drive; Firestore stores metadata, links, workflow and permission state.
- Automatic background email still needs a trusted backend/email provider. Client-side secrets must never be embedded in GitHub.
- Payment gateway integration remains deferred. Manual payment records and verification are the V0.4 path.
