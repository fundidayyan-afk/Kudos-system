# Kudos System Specification

**Project:** Datacom Internal Employee Portal — Kudos Feature
**Role:** AI Architect (Graduate Developer, Datacom)
**Status:** Approved for implementation

---

## 1. Overview

The Kudos System allows employees to publicly recognize and appreciate their
colleagues. Users can select a colleague, write a short message of
appreciation, and submit it to a shared, real-time feed visible on the main
dashboard. Because the feed is public and open-text, the system also needs
administrator-level content moderation to keep the feed safe and useful.

---

## 2. Functional Requirements

### 2.1 User Stories

1. **As a user**, I can log in with my company account so that kudos are
   attributed to a real identity.
2. **As a user**, I can select another user from a searchable dropdown list
   of colleagues so that I can direct my appreciation to the right person.
3. **As a user**, I can write a short message of appreciation (max 500
   characters) so that I can explain why I'm recognizing them.
4. **As a user**, I can submit the kudos, which is validated and stored, so
   that it appears on the public feed.
5. **As a user**, I can view a feed of recent kudos on the dashboard,
   paginated and sorted by most recent, so that I can see recognition
   happening across the company.
6. **As a user**, I cannot send a kudos to myself, and I cannot submit an
   empty or duplicate kudos (same sender, same recipient, same message,
   within a short time window), so that the feed isn't spammed.
7. **As an administrator**, I can view all kudos (including hidden ones) in
   a moderation dashboard so that I can review reported or flagged content.
8. **As an administrator**, I can hide a kudos message from the public feed
   (soft delete) without permanently destroying the record, so that there is
   an audit trail. *(This is the requirement added during the architect
   review — the original AI-generated spec did not include moderation.)*
9. **As an administrator**, I can permanently delete a kudos message when
   necessary (e.g. legal/HR request), so that clearly abusive content can be
   fully removed.
10. **As an administrator**, when I hide or delete a kudos, I can optionally
    record a reason, so that moderation actions are auditable.
11. **As a user**, I can report a kudos message I find inappropriate, so
    that administrators are alerted to review it.

### 2.2 Edge Cases Considered

- **Spam / rate limiting:** a user may only submit a limited number of kudos
  per hour (configurable, default 10) to prevent flooding the feed.
- **Duplicate submissions:** identical sender/recipient/message submitted
  within 60 seconds is rejected (handles accidental double-clicks and
  copy-paste spam).
- **Self-kudos:** a user cannot select themselves as the recipient.
- **Inappropriate content:** basic profanity/keyword filter flags a kudos for
  admin review on submission (it is still published, but flagged), in
  addition to manual admin hide/delete and user reporting.
- **Empty/whitespace-only messages:** rejected client- and server-side.
- **Long messages:** hard 500-character limit enforced client- and
  server-side.
- **Deleted/deactivated users:** if a kudos recipient or sender account is
  later deactivated, the kudos remains visible but is labeled
  ("Former employee") rather than breaking the feed.
- **Empty colleague list / no other users:** UI shows a friendly empty state
  rather than a broken dropdown.

### 2.3 Acceptance Criteria (sample)

- Given a logged-in user, when they submit a kudos with a valid recipient
  and a message between 1–500 characters, then the kudos is stored with
  `is_visible = true` and appears at the top of the public feed.
- Given a user selects themselves as recipient, when they attempt to submit,
  then the client blocks submission and shows an inline error.
- Given an administrator viewing the moderation dashboard, when they click
  "Hide", then the kudos' `is_visible` flag is set to `false`, `moderated_by`,
  `moderated_at`, and `reason_for_moderation` are recorded, and the kudos
  disappears from the public feed immediately.
- Given a non-admin user, when they call any moderation API endpoint, then
  the server returns `403 Forbidden`.

### 2.4 Non-Functional Requirements

- **Responsive design:** the kudos form and feed must be usable on desktop,
  tablet, and mobile viewports (breakpoints at 768px and 480px).
- **Accessibility:** form fields have labels, feed items have sufficient
  color contrast, interactive elements are keyboard-navigable.

---

## 3. Technical Design

### 3.1 Database Schema

**users**

| Field         | Type      | Notes                              |
|---------------|-----------|-------------------------------------|
| id            | UUID (PK) | |
| name           | TEXT      | display name |
| email         | TEXT UNIQUE | login identifier |
| password_hash | TEXT      | bcrypt hash |
| role          | TEXT      | `user` \| `admin`, default `user` |
| is_active     | BOOLEAN   | default `true` |
| created_at    | DATETIME  | |

**kudos**

| Field                  | Type      | Notes                                                     |
|------------------------|-----------|------------------------------------------------------------|
| id                     | UUID (PK) | |
| sender_id              | UUID (FK -> users.id) | who gave the kudos |
| recipient_id           | UUID (FK -> users.id) | who received it |
| message                | TEXT      | max 500 chars, enforced at API layer |
| created_at             | DATETIME  | default now |
| is_visible             | BOOLEAN   | **default `true`** — added for moderation support |
| is_flagged             | BOOLEAN   | default `false` — set by automated keyword filter |
| moderated_by           | UUID (FK -> users.id), nullable | admin who took the moderation action |
| moderated_at           | DATETIME, nullable | when the moderation action occurred |
| reason_for_moderation  | TEXT, nullable | free-text reason (e.g. "spam", "inappropriate language") |
| moderation_action      | TEXT, nullable | `hidden` \| `deleted` \| `restored` |

**reports** *(supports the user-reporting edge case)*

| Field       | Type      | Notes |
|-------------|-----------|-------|
| id          | UUID (PK) | |
| kudos_id    | UUID (FK -> kudos.id) | |
| reported_by | UUID (FK -> users.id) | |
| reason      | TEXT | |
| created_at  | DATETIME | |

**Relationships**
- `users` 1 — N `kudos` (as sender)
- `users` 1 — N `kudos` (as recipient)
- `users` 1 — N `kudos` (as moderator, nullable)
- `kudos` 1 — N `reports`

### 3.2 API Endpoints

| Method | Endpoint                        | Auth        | Description |
|--------|----------------------------------|-------------|--------------|
| POST   | `/api/auth/login`               | Public      | Authenticate, returns JWT |
| GET    | `/api/users`                    | User        | List colleagues (id, name) for the recipient dropdown |
| POST   | `/api/kudos`                    | User        | Create a new kudos |
| GET    | `/api/kudos?page=&limit=`       | User        | Paginated public feed (only `is_visible = true`) |
| POST   | `/api/kudos/:id/report`         | User        | Report a kudos as inappropriate |
| GET    | `/api/admin/kudos?page=&limit=` | Admin       | All kudos, including hidden, for moderation view |
| PATCH  | `/api/admin/kudos/:id/hide`     | Admin       | Soft-hide a kudos (`is_visible=false`, records reason) |
| PATCH  | `/api/admin/kudos/:id/restore`  | Admin       | Un-hide a previously hidden kudos |
| DELETE | `/api/admin/kudos/:id`          | Admin       | Hard delete a kudos |
| GET    | `/api/admin/reports`            | Admin       | List open user reports |

All responses are JSON. Errors follow `{ "error": { "code", "message" } }`.

### 3.3 Frontend Components

```
App
├── LoginPage
├── DashboardPage
│   ├── KudosForm         (recipient dropdown + message textarea + submit)
│   └── KudosFeed
│       └── KudosCard[]   (sender → recipient, message, timestamp, report button)
└── AdminPage
    ├── ModerationTable   (all kudos incl. hidden, hide/restore/delete actions)
    └── ReportsTable      (open user reports)
```

- `KudosForm` performs client-side validation (non-empty, ≤500 chars, recipient
  ≠ self) before calling `POST /api/kudos`.
- `KudosFeed` polls/re-fetches on interval or after a new submission, and
  paginates with a "Load more" control.
- `AdminPage` is only rendered/routed for users with `role === 'admin'`.

### 3.4 Security Considerations

- Passwords hashed with bcrypt; JWT-based session auth (short-lived access
  token).
- All moderation endpoints require `role === 'admin'`, enforced server-side
  via middleware (never trust client-side role checks alone).
- Input sanitization/escaping on message content to prevent stored XSS in
  the feed.
- Rate limiting on `POST /api/kudos` (per-user) to mitigate spam.
- Parameterized queries throughout to prevent SQL injection.

### 3.5 Performance Considerations

- Feed endpoint is paginated (default 20 per page) rather than returning the
  full table.
- Index on `kudos.created_at` and `kudos.is_visible` for fast feed queries.
- Index on `users.email` for login lookups.

### 3.6 Error Handling & Logging

- Centralized Express error-handling middleware returns consistent error
  shapes and appropriate HTTP status codes (400 validation, 401 unauth, 403
  forbidden, 404 not found, 500 server error).
- Server-side request logging (method, path, status, latency) for
  observability; moderation actions are additionally logged to the
  `kudos.moderated_*` fields for audit purposes.

---

## 4. Implementation Plan

1. **Project scaffolding** — set up backend (Node.js/Express) and frontend
   (HTML/CSS/vanilla JS) project structure, dependencies, and SQLite
   database file. *(no dependencies)*
2. **Database layer** — create schema/migration script for `users`, `kudos`,
   `reports` tables, including the moderation fields. *(depends on 1)*
3. **Auth** — implement login endpoint, JWT issuance, and auth middleware.
   *(depends on 2)*
4. **Core kudos API** — implement create-kudos and public-feed endpoints
   with validation, rate limiting, and duplicate detection. *(depends on 3)*
5. **Moderation API** — implement admin-only hide/restore/delete/reports
   endpoints. *(depends on 3, 4)*
6. **Frontend — dashboard** — build login page, kudos form, and public feed
   UI, wired to the API. *(depends on 4)*
7. **Frontend — admin** — build moderation table and reports table, gated to
   admin role. *(depends on 5, 6)*
8. **Responsive styling** — apply breakpoints and mobile layout. *(depends
   on 6, 7)*
9. **Testing** — unit tests for validation logic and moderation
   authorization; manual end-to-end pass through user stories in Section
   2.1. *(depends on all above)*
10. **Deployment prep** — environment config, seed script, README with
    setup instructions. *(depends on 9)*

### Testing Strategy
- Unit tests (Jest) for: kudos validation (length, self-kudos, empty),
  duplicate-detection logic, and admin-only middleware authorization.
- Manual acceptance testing against each user story/acceptance criterion in
  Section 2.1/2.3.

### Deployment Considerations
- SQLite is used for simplicity in this exercise; a production deployment
  would swap in PostgreSQL with the same schema.
- Environment variables for `JWT_SECRET` and `PORT`; never commit secrets.
- `npm run seed` populates demo users (including one admin) for grading/demo
  purposes.
