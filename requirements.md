# P2Care — Incremental Emergency-Care Extension Requirements

**Purpose:** Give Antigravity a precise implementation brief to extend the existing AyushCare codebase into **P2Care** without rebuilding the application or breaking current routine patient-intake and doctor workflows.

**Product name:** P2Care  
**Suggested expansion:** Patient to Care  
**Tagline:** Patient to Care. Without Delay.

## 1. Implementation approach and scope

### Primary instruction to Antigravity

First inspect the repository and understand its existing architecture, routes, API contracts, authentication, database schema, intake flows, SOS functionality (if any), and UI components. Then implement the requirements below as a **small, additive modification** to the existing code. Do not replace the application with a new scaffold, redesign all screens, or remove working features merely because they are outside the emergency workflow.

### Main code areas in scope

- `AyushCareBackend/` — Node.js/Express backend and PostgreSQL integration.
- `HNDPANEL/` — hospital/admin frontend; add emergency operations and unidentified-patient handling.
- `AyushCareKiosk/` — preserve the current kiosk experience and extend its backend integration for emergency intake; apply P2Care branding.
- Other frontend projects (including `AyushCareMobile/`) — update visible product branding/name and compatible shared theme details only where needed. Do not undertake a broad redesign.
- Doctor screens — treat as functionally approved. Keep their layout and behavior unchanged unless a minimal, backward-compatible integration change is necessary.

The repository also contains `AyushCareAI/`. Inspect its API contract and existing use, but do not rewrite the AI service or add new AI dependencies unless essential. Keep any AI changes small, justified, and compatible with the existing service.

## 2. Non-negotiable preservation rules

1. Preserve existing routine OPD/patient-intake flows, identified-patient profiles, doctor screens, existing working routes, and existing features.
2. Prefer additive routes, components, tables, columns, and migrations. Avoid breaking API contract changes.
3. Before changing a route or response shape, search all callers and maintain compatibility or provide a compatibility layer.
4. Do not delete existing database tables, fields, records, routes, UI screens, or features as part of this work.
5. Do not overwrite project configuration wholesale. Preserve existing scripts, dependencies, environment variables, and conventions.
6. Do not hard-code secrets, database credentials, patient data, sample patients, hospital IDs, or production URLs.
7. Do not run destructive schema scripts, seed scripts, or migrations against any existing AyushCare database. Confirm the configured database target before any database mutation. Use a new P2Care database and additive migrations only.
8. Do not commit `.env` files or secrets. Update `.env.example` with placeholders if new configuration is needed.
9. Inspect the code before deciding what already exists. Reuse existing authentication, database helpers, upload/storage, notification, and audit patterns when safe.
10. At the end, provide a clear summary of files changed, migration steps, environment variables, routes added/changed, tests run, and any remaining manual configuration.

## 3. Rebranding: AyushCare → P2Care

Update user-visible branding across the frontend applications, with priority on `HNDPANEL` and `AyushCareKiosk`:

- Product name, page titles, navbar/sidebar labels, login screens, loading states, empty states, error messages, footer text, metadata, and relevant user-facing copy.
- Logos, favicon, and app manifest references where existing assets make this straightforward.
- Update color/theme tokens only as needed to establish a consistent P2Care identity. Reuse the existing design system and components; do not redesign every page.
- Remove obsolete AyushCare branding from visible UI. Do not rename internal folders or package names unless necessary; avoid changes that break scripts/imports.
- Preserve accessibility, responsiveness, and existing visual hierarchy.
- Do not alter medical/consent copy in a way that changes its meaning.
- If the exact brand palette or logo is not present in the repository, use the current palette as the base and make a restrained, consistent adjustment rather than inventing a large new design system.

## 4. Emergency intake from the kiosk

Extend the current kiosk flow so an emergency can be recorded without breaking the normal intake flow.

### 4.1 Intake entry and classification

Provide a clear choice between the existing routine OPD flow and an emergency intake flow. The emergency flow should capture only information that is available and appropriate at that point, such as:

- Emergency category / presenting complaint.
- Time reported and intake source/kiosk identifier when available.
- Patient identity status: identified, identity not confirmed, or unidentified.
- Symptoms or observed circumstances, including accident/road accident, injury, burns/electric shock, cuts/bleeding, pregnancy-related concern, chest pain, breathing difficulty, neurological symptoms/fainting/seizure, fever/acute illness, and other.
- Basic observations/vitals if available, with timestamps and units.
- Communication status (able to communicate, limited communication, unable to communicate, unknown).
- Relevant notes and attachments only if the current application already supports safe upload handling.
- Consent/privacy status and the person recording the information, where available.

Do not force a user to complete a long questionnaire before an urgent alert can be raised. Preserve existing routine intake questions and adapt the emergency flow with minimal changes to the current kiosk UI.

### 4.2 Adaptive questions and red flags

- Reuse existing questionnaire and AI-service capabilities where appropriate.
- Follow-up questions should depend on the selected complaint and previous answers.
- Clearly flag configured emergency warning signs and send the relevant alert immediately; do not wait for the questionnaire to finish.
- Missing answers, unavailable vitals, or inability to communicate must never be interpreted automatically as “low risk.”
- AI may assist with summarization or decision support only. Do not present AI output as a confirmed diagnosis or as a replacement for clinical judgement.
- Make triage status and any urgency label visibly subject to clinical review. Document which rules produced an alert and retain the relevant timestamps.
- Do not invent clinical thresholds or claim clinical validation. Reuse existing reviewed rules if present; otherwise make the rules configurable and mark them for clinician review before production use.

### 4.3 Backend integration

- Validate incoming data on the server.
- Persist emergency intake as an emergency case, linked to an identified patient only when identity is reliably established.
- Return a stable case ID and clear status to the kiosk.
- Prevent duplicate submissions where feasible using an idempotency key or equivalent mechanism.
- Handle timeouts, retries, and partial failures without silently losing a case.
- Do not expose database details, stack traces, secrets, or protected patient data in error responses.

## 5. SOS creation and management

Implement or extend SOS functionality across the kiosk/patient experience and HNDPANEL.

### Required behavior

- An SOS submission creates a persistent, uniquely identified incident/case and records the creation time and source.
- The HNDPANEL emergency dashboard displays new/unacknowledged SOS cases prominently.
- Staff can acknowledge, assign, escalate, update status, add an operational note, and mark an incident resolved, subject to role permissions.
- Record who performed each action and when.
- Show current status, age of alert, priority, and last update.
- Avoid duplicate alerts when a client retries the same request.
- Provide useful empty, loading, error, offline/retry, and success states.
- If realtime updates already exist, reuse them. Otherwise, use a safe existing polling pattern or add a minimal mechanism. Do not add a complex realtime stack solely for this feature.
- Notification delivery failures must not erase the SOS case. Surface failures and allow staff to see the case in the dashboard.
- Use existing SMS/notification integration if configured. Keep provider secrets server-side and provide a development/mock mode where the project already uses one.
- Do not claim an ambulance or external service has been contacted unless the relevant integration confirms it.

## 6. HNDPANEL emergency operations

Add an **Emergency / SOS** area to HNDPANEL, protected by existing staff authentication and server-side authorization.

### Dashboard and case details

Display, at minimum:

- New/unacknowledged alerts.
- Active/in-progress cases.
- Escalated cases.
- Resolved/recent cases.
- Emergency case ID, created time, elapsed time, complaint/category, identity status, communication status, urgency/triage state, assigned staff, and latest update.
- Available patient details only if the requesting staff member has valid authorization.
- A clear indication when information is unavailable, withheld, expired, or not yet verified.

### Staff actions

- Acknowledge an alert.
- Assign/reassign to an authorized staff member.
- Escalate to the configured clinical/operational role.
- Update operational status.
- Add timestamped notes.
- Resolve/close with a reason where appropriate.
- View the action/audit timeline.

Use the existing UI framework and component patterns. Do not redesign the doctor screen. Do not show a patient’s entire profile just because an SOS exists.

## 7. Time-limited token-based access to patient information (maximum 36 hours)

Implement the access rules in the **backend**, not just the frontend.

### 7.1 Authorization model

- Continue using the existing staff login/authentication where possible.
- Require a valid authenticated staff session/token for protected admin APIs.
- Use server-side role/permission checks on every protected endpoint. Hiding a button in the UI is not authorization.
- Separate permission to receive/manage an emergency alert from permission to view protected medical records.
- An SOS or emergency-case record must not automatically grant unrestricted access to the patient’s medical history.
- Grant patient-information access through a scoped access grant/token or equivalent server-side authorization record.
- Each grant must be bound to the authenticated staff identity, patient or emergency case, permitted data categories, purpose/reason, issue time, expiry time, and status.
- The maximum lifetime of a grant is **36 hours from issuance**. Never allow a client to choose a longer expiry. Enforce the maximum on the server.
- The server must reject expired, revoked, malformed, wrong-patient, wrong-scope, and wrong-staff access.
- Recheck access on every protected API request; do not trust a previously loaded frontend screen.
- Support revocation before expiry and record the revocation actor/time/reason.
- Do not place sensitive medical data in token payloads. Tokens should contain only minimal identifiers/claims; validate them server-side and use short-lived signed credentials where appropriate.
- If the existing authentication uses JWT, preserve its compatible flow while separating the login/session token from the patient-specific authorization grant. Do not treat a normal staff login JWT as blanket permission to access all patient records.
- Do not expose access tokens in URLs, logs, analytics, or browser-visible error messages.

### 7.2 Audit trail

Audit at least:

- Access grant requested, approved/issued, denied, expired, and revoked.
- Staff identity and role.
- Patient/case identifier and data categories/scope.
- Purpose/reason and timestamp.
- Successful and denied attempts to access protected patient information.
- Emergency-case status changes and staff actions.
- Any emergency override/break-glass use, if the existing product supports or the implementation explicitly adds it.

Audit records must be append-only from normal application workflows. Do not log passwords, full bearer tokens, or unnecessary medical details.

### 7.3 Emergency override (“break-glass”)

Do not add an unrestricted emergency bypass by default. If an override is necessary for the existing product requirements, it must require a documented reason, be narrowly scoped, visibly flagged, time-limited, auditable, and reviewable. It must not silently bypass authorization. Keep emergency alert handling operational even when record access has not been granted.

### 7.4 Frontend behavior

- Show when access was granted and when it expires.
- Clearly indicate that access ends no later than 36 hours after issuance.
- Handle `401`/`403`/expired access by removing protected data from view and showing a clear message.
- Do not cache protected records beyond their authorization window. Clear sensitive state on logout, expiry, revocation, and patient switch.
- Do not imply that a screen is authorized merely because it was opened earlier.

## 8. Separate workflow for unidentified or non-communicative patients

Add a dedicated HNDPANEL option, for example **“Unidentified / Unable to Communicate”** or **“Unidentified Emergency Case.”** This is for patients who are unidentified, unable to communicate, or brought in after a road accident.

**This workflow must be clearly separate from normal identified-patient profiles and the normal patient table/list UI.** Do not create a fake patient profile with invented identity details.

### 8.1 Separate records and UI

- Add a dedicated **Unidentified / Emergency Cases** list and detail view in HNDPANEL.
- Use a separate database table/entity for unidentified emergency cases (choose a name consistent with repository conventions, e.g. `unidentified_emergency_cases`) rather than placing these cases directly into the identified-patient profile table.
- The table can reference an identified patient only after identity has been verified and a controlled linking/conversion action has occurred.
- Do not mix these cases into the normal identified-patient directory by default.
- Display a temporary case number/UUID, identity status, reported circumstances, time received, communication status, available observations, assigned staff, urgency/triage state, SOS state, and case status.
- Support “identity unknown,” “identity being verified,” and “identity confirmed.”
- If identity is later confirmed, provide a controlled action to link the emergency case to an existing patient or create/link a verified profile. Preserve the original temporary case ID and audit the linkage. Avoid accidental duplicate profiles.
- Make the distinction visible in navigation, page title, badges, and search results.
- Search should allow staff to find the temporary case by case ID and authorized case metadata without pretending an unknown person has a known name.

### 8.2 Intake and workflow

- Allow authorized staff to create a case from HNDPANEL when a patient is brought in by responders or found after an accident.
- Capture “unable to communicate” and “identity unknown” independently; either or both may apply.
- Allow the kiosk/backend to create the same type of emergency case when appropriate.
- Accept unknown/unavailable values without blocking urgent case creation.
- Support accident details and notes, but avoid requiring identity documents or patient consent when the patient cannot provide them. Any access to medical records still requires the applicable lawful, policy-approved authorization.
- Provide a way to update the case when communication resumes or identity is confirmed.
- Do not assume that an unidentified patient has no existing medical history. Do not merge records automatically based only on a name, approximate age, or other weak match.
- Preserve an audit trail of changes and identity verification.

## 9. Database and migration requirements

Inspect the current PostgreSQL schema and reuse existing entities where appropriate. Design the smallest additive schema changes that support the requirements. Possible entities/fields include the following; adapt names and relationships to the actual schema rather than blindly creating duplicates:

- Emergency case / emergency intake.
- SOS incident and its status/action history, if not already represented.
- Unidentified emergency case.
- Patient-specific staff access grant, including scope, expiry, revocation, and purpose.
- Access and action audit events.
- Staff assignment, if not already supported.

Requirements:

1. Use migrations that are additive, repeatable where practical, and safe for existing data.
2. Add appropriate foreign keys, indexes, uniqueness constraints, timestamps, and status constraints.
3. Use transactions for multi-step case creation/linking where appropriate.
4. Do not delete or rename existing tables or columns as part of this feature.
5. Do not automatically run seed scripts against a configured database.
6. Before running any migration, verify the backend points to the intended **new P2Care database**. Never target the old AyushCare database.
7. Do not add real patient data to seed files. Use clearly synthetic test fixtures.
8. If the repository has no migration framework, add a simple documented migration approach consistent with its current Node.js/PostgreSQL architecture. Avoid a large framework migration unless necessary.
9. Keep the Python AI service's SQLite development database unchanged unless a specific, justified integration need is discovered. Do not silently repoint it to a production database.

## 10. API design and compatibility

Review current routes first. Reuse existing route naming and response conventions. Add endpoints only where needed. Potential API capabilities include:

- Create emergency intake.
- Create SOS.
- List and retrieve emergency cases for authorized staff.
- Acknowledge, assign, escalate, update, and resolve an incident.
- Create, inspect, and revoke a patient-specific access grant.
- Retrieve only the patient data categories authorized by the active grant.
- Create/list/update unidentified emergency cases.
- Confirm identity and link a temporary case to an identified patient.
- Retrieve audit/action history for authorized roles.

These are capability requirements, **not a demand to duplicate existing endpoints**. Prefer extending existing APIs if suitable. Document each added/modified endpoint, its authentication and authorization requirements, request/response shape, validation, and expected errors.

Use consistent HTTP status codes. Validate IDs, enums, timestamps, text lengths, and payload shapes. Apply rate limiting to authentication and abuse-prone SOS/access-grant endpoints if the current backend has a compatible mechanism. Avoid leaking whether protected patient records exist to unauthorized callers.

## 11. Security, privacy, and data handling

- Enforce least privilege and deny access by default.
- Keep authentication secrets and provider credentials server-side.
- Validate and sanitize input; use parameterized SQL queries.
- Enforce file-upload restrictions if attachments are supported.
- Do not return protected medical fields in dashboard list endpoints unless necessary and authorized.
- Do not store protected data in browser local storage unless the current architecture explicitly requires it and a security review justifies it. Prefer existing secure session patterns.
- Clear protected frontend state on logout, expiry, revocation, and user/case changes.
- Record access and status changes in an audit trail.
- Minimize data collected for unidentified patients and distinguish verified facts from assumptions.
- Do not make unsupported claims of compliance with DPDP, ABHA, or other legal/healthcare requirements. Identify any compliance-dependent behavior as requiring product/legal review.
- Provide safe error handling and avoid logging patient information or credentials unnecessarily.

## 12. Testing requirements

Add or update tests consistent with the repository's existing testing setup. At minimum, verify:

### Regression
- Existing routine OPD flow still works end-to-end.
- Existing identified-patient profile and doctor screens still work.
- Existing login and existing API consumers remain compatible.
- Existing uploads/notifications continue to work where configured.

### Emergency and SOS
- Emergency intake creates a persistent case and returns a case ID.
- Red-flag alerting does not wait for the full questionnaire.
- Duplicate submissions/retries do not create duplicate incidents where idempotency is supported.
- SOS appears in HNDPANEL and status/assignment actions are persisted and audited.
- Notification failure does not delete the case.
- Unknown or missing data does not silently classify a case as low risk.

### Authorization and 36-hour expiry
- Unauthenticated staff cannot access protected endpoints.
- Authenticated staff without the required role/scope cannot view protected data.
- A valid scoped grant permits only its allowed patient/data categories.
- A grant for one patient cannot be used for another.
- Expired and revoked grants are rejected by the backend.
- The server never accepts a grant expiry beyond 36 hours from issuance.
- Access is rejected even if a client continues to display a previously opened screen.
- SOS management and medical-record access remain distinct permissions.
- Audit events are written for granted/denied access and status changes.

### Unidentified cases
- An unidentified case can be created without a patient profile.
- An unable-to-communicate patient can be recorded even if identity is unknown.
- Such cases appear in the separate list and not the ordinary identified-patient directory.
- Identity confirmation/linking is explicit, authorized, and audited.
- Weak matches do not automatically merge records.

### Quality
- Validate API errors, loading/empty states, mobile/responsive layouts, and permission-denied states.
- Run the available backend and frontend lint/build/test commands. Report failures honestly; do not claim checks passed unless they ran successfully.

## 13. UI and usability requirements

- Match the existing HNDPANEL layout and components.
- Add clear navigation entries for Emergency / SOS and Unidentified Emergency Cases.
- Use readable urgency/status badges, timestamps, elapsed time, assignment, and latest update.
- Make patient identity status impossible to confuse: identified profile versus temporary unidentified case.
- Show access scope and expiry clearly wherever protected data is visible.
- Keep urgent workflows short and resilient; do not block emergency case creation on nonessential optional fields.
- Preserve keyboard accessibility, responsive behavior, and consistent error/loading states.
- Do not change the doctor screen's design or workflow unless a specific backend compatibility issue requires a minimal change.

## 14. Environment and setup documentation

- Inspect current `.env.example` files and add placeholders only for genuinely new settings.
- Never place credentials in source code or commit a real `.env`.
- Keep the Node.js backend's PostgreSQL configuration consistent with its existing `pg` connection approach.
- Do not change the AI service's database configuration without documenting and justifying it.
- Document local setup, migration execution, required environment variables, how to run each affected frontend/backend, and how to test the emergency workflow.
- Include a clear warning to confirm the target database before running migrations.

## 15. Suggested implementation order

1. **Repository reconnaissance:** map the existing flows, routes, data model, auth middleware, storage, and frontend API clients. Record what already exists.
2. **Compatibility plan:** describe the minimal changes and any migration/API risks before editing.
3. **Backend foundation:** implement additive schema migration(s), input validation, emergency/unidentified case persistence, SOS actions, scoped 36-hour access grants, and audit logging.
4. **Kiosk integration:** add the emergency path and connect it to the new/extended backend APIs while preserving routine OPD intake.
5. **HNDPANEL integration:** add emergency/SOS dashboard and the separate unidentified-case workflow; enforce UI permissions in addition to backend enforcement.
6. **Branding:** update visible P2Care branding consistently across the affected frontends without broad redesign.
7. **Testing:** run regression and new tests; fix compatibility issues.
8. **Handover:** document files changed, routes, schema changes, migration commands, environment settings, tests, and manual verification steps.

Do not start with a full rewrite. If a requirement conflicts with existing architecture or a currently working flow, explain the conflict and implement the safest additive option.

## 16. Definition of done

The task is complete only when:

- Existing routine intake, identified profiles, and doctor screens continue to work.
- The kiosk can create an emergency case through the backend.
- SOS incidents persist and can be acknowledged, assigned, escalated, updated, and resolved in HNDPANEL.
- HNDPANEL has a distinct unidentified/non-communicative emergency workflow and separate case storage.
- Identified-patient records and unidentified temporary cases are not accidentally mixed.
- Protected patient information is served only after backend authorization with patient-specific scope.
- Access grants expire no later than 36 hours after issuance and can be revoked; expiry/revocation are enforced server-side.
- Emergency alert permissions do not automatically expose full medical records.
- Relevant access and operational actions are audited.
- Visible product branding says P2Care across affected frontend screens.
- Database changes are additive and documented; the old AyushCare database is not modified.
- Tests/builds are run and their actual results are reported.
- Antigravity provides a concise change summary and manual verification checklist.

---

## Instruction to Antigravity

Treat this document as the requirements baseline. Start by inspecting the repository and summarizing the existing implementation and proposed minimal change plan. Then implement the changes in small, verifiable steps. Do not stop after writing a plan, and do not rebuild the application from scratch. Preserve all working functionality unless a change is explicitly required above.
