# StudioDesk data model

## users/{uid}
Role identity and app access state.

Core fields: `displayName`, `role`, `status`.

Roles planned: `owner`, `admin`, `project_manager`, `lead_designer`, `designer`/`worker`, `finance`, `client`.

## clients/{clientId}
CRM record. Project documents duplicate only the small client fields needed for fast project screens.

## projects/{projectId}
The lifecycle record for one creative engagement.

Important fields include `clientId`, `accessUserIds`, `managementUserIds`, `workerIds`, `clientUserIds`, configured assets, total value, balance, project state, progress, release state, deadline, blockers and archive state.

## tasks/{taskId}
Generated from production standards. Tasks are not hand-built for standard projects. Each task points back to a project and retains its standard-step ID, weight and estimated effort.

## standards/{standardId}
Internal Wiscode Studio production standards. These can contain steps, dependencies, deliverables and workflow intelligence. Never expose this collection publicly.

## catalogAssets/{assetId}
Sanitized, potentially public shoppable outputs. Contains display copy, public pricing mode/value, standard link and guideline eligibility. Internal process logic stays in `standards`.

## publicConfig/branding
Public commercial configuration such as foundation price, currency and deposit rate. It intentionally contains no internal company/legal data.

## packageRequests/{requestId}
Public configurator submissions. Anonymous Auth supplies an invisible UID only when the visitor submits.

## invoices/{invoiceId}
Project-linked invoices with amount, paid amount, balance, currency and status.

## payments/{paymentId}
Immutable/confirmed payment events. A payment event updates the invoice balance; it should not be represented as a single `paid = true` flag.

## expenses/{expenseId}
Studio or project costs. Restricted to Owner/Admin/Finance.

## reviews/{reviewId}
Internal/client review records and approval decisions. Review assets themselves should live in Drive; Firestore holds metadata and access state.

## activity/{activityId}
Append-only project audit timeline.

## portfolio/{portfolioId}
Company or worker portfolio candidate. `authorizedUserIds` controls internal Past Work visibility; public publishing rights are a separate state.

## settings/studio
Private operational/company settings. CAC/legal profile fields belong here or in a dedicated private legal document, not in public configuration.

## legalAcceptances/{acceptanceId}
Evidence of portal terms acceptance: exact terms version, user, project/portal, timestamp and relevant audit information.
