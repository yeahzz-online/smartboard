# CMR Smart Presentation Portal

Production-ready educational presentation management system for campuses. Provides role-based access for Admin, Faculty, Student, and Smartboard devices, secure file uploads and sharing, QR-driven smartboard sessions, and integration with Supabase for file storage.

---

Table of contents

- Project overview
- Features
- Architecture & Tech stack
- Folder layout
- Prerequisites
- Quick start (backend & frontend)
- Environment variables
- Demo accounts & seeding
- Storage and uploads (Supabase)
- Running in production
- Development notes
- Contributing
- Troubleshooting
- License & contact

---

Project overview

CMR Smart Presentation Portal is designed for educational institutions to manage presentation uploads, class materials, and live smartboard sessions. The system supports:

- Role-based access: Admin, Faculty, Student, Smartboard
- Secure authentication with access + refresh tokens, OTP email verification on registration
- File upload and streaming via Supabase storage (or alternative providers)
- Smartboard pairing via QR session exchange for in-class presentations
- Admin analytics and management for departments, classes, subjects, and users

Features

- User registration and login with role-aware validation and OTP email verification
- Access token (short lived) and refresh token (long lived) flow with revocation
- Student and Faculty dashboards with upload/listing/download/view support
- Supabase-backed upload flow and signed download URLs
- Smartboard token exchange flow for pairing and session control
- Security middleware: Helmet, CORS, rate limiting, centralized error handling
- Optional Python SMTP bridge for environments where Node mailers are restricted

Architecture & Tech stack

- Frontend: React (Vite), Tailwind CSS, React Router, Axios, Context API
- Backend: Node.js, Express.js, MongoDB (Mongoose), JWT, bcrypt
- Storage: Supabase Storage (preferred) — signed URLs for uploads/downloads
- Dev tooling: PM2, Nginx (for reverse proxy), optional Docker

Folder layout (high level)

backend/
  - app.js / server.js (Express entry points)
  - config/ (env, db connection)
  - controllers/
  - routes/
  - middlewares/ (auth, error handling, rate limiting)
  - models/ (Mongoose schemas)
  - services/ (supabase, mail, storage helpers)
  - utils/ (helpers, validators)
  - sql/schema.sql (optional SQL schema for hybrid setups)

frontend/
  - index.html
  - package.json
  - tailwind.config.js
  - src/
    - components/
    - pages/
    - layouts/
    - hooks/
    - context/
    - services/ (api wrappers)
    - routes/
    - styles/

Prerequisites

- Node.js 18+ (or current LTS)
- npm or yarn
- MongoDB (local, Atlas, or other hosted DB reachable by MONGO_URI)
- (Optional) Supabase project and service role key for storage operations
- (Optional) Python 3 if using MAIL_PROVIDER=python

Quick start

Backend (development)

1. Open a terminal, go to backend:

```bash
cd backend
npm install
cp .env.example .env
# Edit backend/.env and fill MONGO_URI, JWT secrets, SUPABASE_* if using Supabase
npm run dev
```

The dev script runs the server with nodemon (or an equivalent). The server listens on the port configured via PORT.

Frontend (development)

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit env.local to set VITE_API_BASE_URL and any frontend keys (e.g., VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
npm run dev
```

Open the frontend dev server (usually http://localhost:5173) and the backend API (e.g., http://localhost:3000).

Environment variables (high-level)

backend/.env (important variables)

- PORT - server port
- MONGO_URI - MongoDB connection string
- JWT_ACCESS_SECRET - JWT access token secret
- JWT_REFRESH_SECRET - JWT refresh token secret
- ACCESS_TOKEN_EXPIRY - e.g. 1h
- REFRESH_TOKEN_EXPIRY - e.g. 30d
- SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS - for direct SMTP
- MAIL_PROVIDER - "node" (default) or "python" if using the Python bridge
- PYTHON_BIN - path to Python when using python mail bridge
- STORAGE_PROVIDER - "supabase" or "local"
- SUPABASE_URL - if using Supabase
- SUPABASE_SERVICE_ROLE_KEY - required for server-side signed URL operations
- SUPABASE_STORAGE_BUCKET - bucket name

frontend/.env.local (examples)

- VITE_API_BASE_URL - e.g. http://localhost:3000
- VITE_SUPABASE_URL - optional (public project URL)
- VITE_SUPABASE_KEY - optional (publishable key for direct client operations)

Demo accounts & seeding

A seed script is available to populate demo Admin / Faculty / Student accounts for local testing.

```bash
cd backend
npm run seed:mongo
```

Default demo credentials (only for local/dev):

- Admin: admin@cmrcet.ac.in / Admin@123
- Faculty: faculty.demo@cmrcet.ac.in / Faculty@123
- Student: 22h51a0501@cmrcet.ac.in / Student@123

Storage and uploads (Supabase)

The backend generates server-signed upload URLs (or direct signed download URLs) using the Supabase service role key. For production safety:

- Keep SUPABASE_SERVICE_ROLE_KEY on the server only — never in frontend envs.
- If you want client-side direct uploads, implement a server-signed URL endpoint that validates user role and intent.

Smartboard flow

- Faculty creates/starts a smartboard presentation session which issues a QR code.
- Smartboard device scans the QR and exchanges a temporary token to pair with the faculty session.
- Smartboard receives limited session credentials and can request approved presentation URLs from the server.

Running in production

- Build the frontend (npm run build) and serve via Nginx or an S3 + CloudFront static site.
- Run the backend under PM2 or as a systemd service, behind Nginx as reverse proxy.
- Use HTTPS, set secure cookie flags, and configure strong CORS rules.

Suggested Nginx reverse proxy snippet (example)

- point Nginx at the backend API and the static frontend build directory

Security notes

- Use Helmet and enable rate-limiting to reduce attack surface.
- Store JWT secrets in a secrets manager in production.
- Enforce strong password policies and limit OTP attempts.
- Revoke refresh tokens on logout and critical account changes.

Development notes & useful commands

- Run backend tests (if present): `cd backend && npm test`
- Run frontend lint/build: `cd frontend && npm run lint` / `npm run build`
- Seed local DB: `npm run seed:mongo`
- Start both local servers concurrently: consider using `concurrently` or a docker-compose setup for convenience

Contributing

- Fork the repo and open a pull request with a clear description and tests where applicable.
- Follow existing code style and add unit/integration tests for new features.

Troubleshooting

- "Cannot connect to MongoDB": confirm MONGO_URI and network access (Atlas IP whitelisting or SRV formatting)
- "Supabase upload errors": ensure SUPABASE_SERVICE_ROLE_KEY is set and bucket exists
- "Emails not sending": check MAIL_PROVIDER value, SMTP connectivity, or PYTHON_BIN when using python bridge

Useful links in the repo

- Backend SQL schema: backend/sql/schema.sql
- Backend env example: backend/.env.example
- Frontend env example: frontend/.env.example

License & contact

This project is provided as-is. Add your preferred LICENSE file in the repository root.

For questions or issues, open an issue on the repository or contact the maintainers.

---

(If you want, confirm and the README.md will be committed/pushed. This README replaces the previous content.)

Production-ready educational presentation management system with role-based access for Admin, Faculty, Student, and Smartboard.

## Tech Stack
- Frontend: React (Vite), Tailwind CSS, React Router, Axios, Context API
- Backend: Node.js, Express.js, MongoDB (Mongoose), JWT (Access + Refresh), bcrypt, Nodemailer, optional Python SMTP bridge
- Cloud: MongoDB/Atlas, Supabase storage, Nginx, PM2

## Folder Structure
```text
backend/
  app.js
  server.js
  .env.example
  config/
  controllers/
  routes/
  middlewares/
  models/
  services/
  utils/
  sql/schema.sql

frontend/
  index.html
  package.json
  .env.example
  tailwind.config.js
  src/
    components/
    pages/
    layouts/
    hooks/
    context/
    services/
    routes/
    styles/

```

## Backend Quick Start
```bash
cd backend
npm install
cp .env.example .env
# ensure MongoDB is running and set MONGO_URI in .env
# Optional: set STORAGE_PROVIDER=supabase and configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET
npm run dev
```

## Pre-Login Demo Accounts
Run Mongo demo seed:
```bash
cd backend
npm run seed:mongo
```

Use these credentials:
- Admin: `admin@cmrcet.ac.in` / `Admin@123`
- Faculty: `faculty.demo@cmrcet.ac.in` / `Faculty@123`
- Student: `22h51a0501@cmrcet.ac.in` / `Student@123`

## Optional Python Mailer Mode
- Set `MAIL_PROVIDER=python` in `backend/.env`
- Ensure Python 3 is installed and reachable with `PYTHON_BIN`
- Keep SMTP values configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

## Frontend Quick Start
```bash
cd frontend
npm install
cp .env.example .env.local
# fill in your Supabase URL and publishable key
npm run dev
```

## Implemented Core Features
- Registration with role-aware email validation
  - Student regex: `^(2[1-9])h5[1-5][a-z]\d{4}@cmrcet\.ac\.in$`
  - Faculty regex: `^(?!\d+@)[a-z][a-z0-9._-]*@cmrcet\.ac\.in$`
- OTP email verification with 5-minute expiry
- Configurable OTP resend cooldown and secure OTP generation (`crypto.randomInt`)
- Optional Python SMTP bridge for email sending (`MAIL_PROVIDER=python`)
- Access token (1h) + refresh token (30d default) flow
- Refresh token persistence and revocation
- `verifyJWT` and `authorizeRoles(...roles)` middleware
- Student routes for home metrics, upload URL generation, and PPT listing
- Faculty routes for dashboard/classes/smartboard summary
- Admin protected routes for departments/classes/subjects/users/analytics
- Smartboard QR session + faculty authorization + smartboard token exchange
- Supabase-backed upload flow and Office embed URL support
- Security stack: Helmet, CORS, rate limiting, centralized error handling

## SQL Schema
Use:
- [`backend/sql/schema.sql`](/C:/Users/manoh/Downloads/presentation/backend/sql/schema.sql)

## Deployment Notes
Set the backend environment variables in `backend/.env` and run the backend with Supabase storage enabled.
#   c l a s s 
 
 