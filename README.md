# Kudos System: Datacom Internal Portal

A peer-recognition ("kudos") feature for the internal employee portal, built
using a spec-driven development process. See [`SPECIFICATION.md`](./SPECIFICATION.md)
for the full requirements and technical design that this implementation was
built from.

## Features

- Users log in, select a colleague, and send a short appreciation message
- Public, paginated feed of recent kudos on the dashboard
- Spam/duplicate/self-kudos protection
- Admin moderation dashboard: hide, restore, or permanently delete kudos,
  with recorded reason/audit trail (`is_visible`, `moderated_by`,
  `moderated_at`, `reason_for_moderation`)
- Users can report inappropriate kudos for admin review
- Responsive UI (desktop, tablet, mobile)

## Tech Stack

- **Backend:** Node.js, Express, built-in `node:sqlite` (no native build step
  required), JWT auth, bcrypt password hashing
- **Frontend:** Plain HTML/CSS/JavaScript (no build tooling required),
  served as static files by the Express server

## Requirements

- Node.js **v22.5+** (for the built-in `node:sqlite` module)

## Setup

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET for anything beyond local demo use
npm run seed               # creates kudos.db and seeds demo users
npm start                   # starts the server on http://localhost:3000
```

Then open `http://localhost:3000` in your browser.

### Demo accounts (created by `npm run seed`)

| Role  | Email                  | Password        |
|-------|-------------------------|-----------------|
| User  | alice@datacom.test      | Password123!    |
| User  | ben@datacom.test        | Password123!    |
| User  | chloe@datacom.test      | Password123!    |
| User  | dev@datacom.test        | Password123!    |
| Admin | admin@datacom.test      | AdminPass123!   |

Log in as an admin to see the "Admin" link in the navbar and access the
moderation dashboard at `/admin.html`.

## Running Tests

```bash
cd backend
npm test
```

## Project Structure

```
kudos-system/
├── SPECIFICATION.md        # Requirements + technical design (spec-driven dev)
├── README.md
├── backend/
│   ├── src/
│   │   ├── db/              # Schema + seed script (node:sqlite)
│   │   ├── middleware/      # Auth, error handling, request logging
│   │   ├── routes/          # auth, users, kudos, admin
│   │   ├── utils/           # Content filter
│   │   ├── app.js
│   │   └── server.js
│   └── test/                # Unit tests
└── frontend/
    ├── index.html           # Login + dashboard (kudos form + feed)
    ├── admin.html           # Moderation dashboard
    ├── css/styles.css
    └── js/
        ├── api.js
        ├── dashboard.js
        └── admin.js
```

## API Overview

See `SPECIFICATION.md` §3.2 for the full endpoint list. Highlights:

- `POST /api/auth/login`
- `GET /api/users`
- `POST /api/kudos` / `GET /api/kudos`
- `POST /api/kudos/:id/report`
- `GET /api/admin/kudos`, `PATCH /api/admin/kudos/:id/hide`,
  `PATCH /api/admin/kudos/:id/restore`, `DELETE /api/admin/kudos/:id`,
  `GET /api/admin/reports`

## Development Process

This project was built using spec-driven development:

1. Generated an initial requirements/design spec from a high-level feature
   request.
2. As architect, reviewed and refined the spec — adding the administrator
   moderation user story and the `is_visible`/`moderated_by`/`moderated_at`/
   `reason_for_moderation` schema fields that the original request omitted.
3. Approved the finalized spec (`SPECIFICATION.md`).
4. Implemented the feature end-to-end against that approved spec.
