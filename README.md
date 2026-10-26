# Applications Backend API

REST API starter for an existing printing/scanning app. It manages form categories, form templates/PDF uploads, and users' saved application data using Node.js, Express, Mongoose, and MongoDB.

## Requirements

- Node.js 20+
- MongoDB local instance or MongoDB Atlas
- npm

## Run locally

1. Extract the project.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Set `MONGODB_URI` and a long random `JWT_SECRET` (32+ characters).
5. Run `npm run dev`.
6. Health check: `GET http://localhost:5000/health`.

Never commit `.env` or production secrets.

## Authentication

- `POST /api/auth/register` creates a regular user only.
- `POST /api/auth/login` returns a JWT token.
- Send protected requests with `Authorization: Bearer YOUR_TOKEN`.
- Public registration cannot create admins. Set up the first admin through a trusted one-time script or directly in the database after hashing a password; do not expose an admin-registration endpoint.

Example login:
```json
{ "email": "admin@example.com", "password": "your-long-password" }
```

## Endpoints

### Auth
- `POST /api/auth/register` body: `{ "name": "...", "email": "...", "password": "minimum 12 chars" }`
- `POST /api/auth/login` body: `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` authenticated

### Categories (admin write; public read active categories)
- `GET /api/categories`
- `POST /api/categories` body: `{ "name": "Passport", "description": "Passport services" }`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### Form templates (public read active forms; admin write)
- `GET /api/forms?search=passport&page=1&limit=20`
- `GET /api/forms/:id`
- `POST /api/forms` multipart/form-data: `title`, `category`, optional `description`, `formType`, `fields` (JSON string), `officialUrl`, `version`, and optional `file` (PDF).
- `PUT /api/forms/:id` multipart/form-data or JSON
- `PATCH /api/forms/:id`
- `DELETE /api/forms/:id` (deactivates if saved applications reference it)

Example `fields` value for multipart form:
```json
[
  {"name":"fullName","label":"Full Name","type":"text","required":true},
  {"name":"dateOfBirth","label":"Date of Birth","type":"date","required":true},
  {"name":"address","label":"Address","type":"textarea","required":true},
  {"name":"licenceType","label":"Licence Type","type":"select","required":true,"options":["Learner","Permanent"]}
]
```

### User applications (authenticated; owner-scoped)
- `POST /api/applications` body: `{ "formTemplateId": "MONGODB_ID", "data": { "fullName": "Example User" }, "status": "draft" }`
- `GET /api/applications?page=1&limit=20&status=draft` (returns current user's records only)
- `GET /api/applications/:id`
- `PUT /api/applications/:id` body can include `data`, `notes`, `status`
- `PATCH /api/applications/:id`
- `DELETE /api/applications/:id`
- `POST /api/applications/:id/print` marks ready-to-print record as printed. **Replace the marked TODO with your existing printer/job-queue integration before using this in production.**

## Example workflow

1. Register/login a normal user and save their JWT.
2. Create a category using an admin token.
3. Upload a PDF form using an admin token.
4. Frontend calls `GET /api/forms` to render the library.
5. User selects a form and submits its field values using `POST /api/applications`.
6. User can retrieve/edit/delete their own draft records.
7. Connect the print endpoint to the existing printing service.

## Important production notes

- Uploaded PDFs are stored in **MongoDB GridFS** (bucket `pdfs`), served via `GET /api/files/:id`. This keeps files durable across redeploys on ephemeral hosts (the legacy `uploads/` folder is no longer used for new uploads). See `DEPLOY.md`. Note Atlas free (M0) is capped at 512 MB total; for large-scale use switch to S3-compatible object storage.
- PDF MIME/extension checks are not full malware scanning. Add malware scanning and content inspection before public uploads.
- Do not store real passport numbers, Aadhaar numbers, scans, or identity documents until you have designed appropriate consent, encryption, access logging, retention, and deletion controls.
- Add a trusted admin bootstrap process, audit logs, backups, and monitoring before production.
- Government forms and official portals can change. Verify source, permission to redistribute, version/date, and official submission process.
- This starter prepares records; it does not submit applications to government portals.
- Use HTTPS in production. Configure CORS to exact frontend origins.
- The API is a starter scaffold; run integration/security tests and connect it to your current project's auth and print system before deploying.
