# StudioDesk V1 Architecture Freeze — Build 0.1

## Core principle
No module operates in isolation. Every meaningful action can update project state, progress, health, finance, review gates, delivery gates, notifications, portfolio readiness and the audit trail.

## Project compilation
Client/configurator chooses outputs (shoppable assets). StudioDesk owns the production method (fixed foundation + asset standards).

selected assets -> diagnostic engine -> deduplicated steps -> dependencies -> deliverables -> workload -> timeline -> assignments -> project tasks

## Asset dependency types
1. Required dependency
2. Shared dependency
3. Composite dependency
4. Conditional dependency

Brand Guidelines is a composite output assembled from completed identity systems. Four eligible identity assets can qualify for a one-page brand presentation. Broader completed systems can qualify for full guidelines; thresholds are editable standards.

## Pricing states
- Live standard price: mutable; instantly updates public/new configuration calculations.
- Quoted price: snapshot at quote issuance.
- Accepted project price: frozen unless an explicit scope/price adjustment is created.

## Storage
Firestore: records, metadata, permissions, statuses, activity, pricing, tasks, finance.
Google Drive: research images, client assets, moodboards, working files, source files, review sources and final deliveries.
Firebase Storage: intentionally excluded from V1 Spark architecture.

## Review/release states
working source -> protected review preview -> internal approval -> client review -> client approval -> payment gate -> clean final release -> delivery -> close/archive

Approval is not delivery. Delivery is not project closure.

## Archive and portfolio
On close: project leaves active views, enters hidden Past Projects, freezes contribution snapshot, updates finance/analytics, and generates company + worker portfolio candidates. Past-project access defaults to owner + actual contributors only.

## Roles
Owner, Admin, Lead Designer/Project Manager, Designer, Finance, Client. Project/object-level access may further narrow role permissions.

## Legal layers
Portal Terms: mandatory before client preview access.
Invoice Terms: small jobs.
Project Agreement: larger/higher-risk packages only.
CAC/company information is stored in Legal Business Profile and rendered only where appropriate.
