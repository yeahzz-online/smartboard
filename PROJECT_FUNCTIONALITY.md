PROJECT: CMR Smart Presentation Portal - Functionality Documentation

This document describes the existing project in this workspace. It is based exclusively on the source code present in the repository and references actual files. Do not change code or configuration while reading this.

Repository root: C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet

---------------------------------------------------------------------------------------------------
1. PROJECT STRUCTURE (main folders and important files)
---------------------------------------------------------------------------------------------------
High level:
- backend/ — Express backend (Node.js, Mongoose). Entry points: [app.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/app.js) and [server.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/server.js).
- frontend/ — React (Vite) frontend (SPA). Entry: [frontend/src/main.jsx](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/frontend/src/main.jsx) and [vite.config.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/frontend/vite.config.js).

Backend important folders/files:
- backend/app.js — Express app configuration (helmet, cors, rate-limiting, routes, static serving).
- backend/server.js — loads env files and starts server after Mongo connection.
- backend/config/mongo.js — MongoDB connect logic, index management.
- backend/config/jwt.js — JWT signing/verification helpers (used extensively; referenced by controllers/middlewares).
- backend/routes/*.js — Express routes mapping to controllers (authRoutes.js, studentRoutes.js, facultyRoutes.js, adminRoutes.js, storageRoutes.js, supabaseRoutes.js).
  - [backend/routes/authRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/authRoutes.js)
  - [backend/routes/studentRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/studentRoutes.js)
  - [backend/routes/facultyRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/facultyRoutes.js)
  - [backend/routes/adminRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/adminRoutes.js)
  - [backend/routes/storageRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/storageRoutes.js)
- backend/controllers/* — business logic for each route group, e.g. [authController.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/controllers/authController.js), [studentController.js], [facultyController.js], [adminController.js].
- backend/mongoModels/* — Mongoose schemas stored under backend/mongoModels (User.js, Upload.js, SmartboardSession.js, RefreshToken.js, Subject.js, Class.js, Department.js, etc.).
  - Example: [backend/mongoModels/User.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/mongoModels/User.js)
  - Example: [backend/mongoModels/Upload.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/mongoModels/Upload.js)
- backend/models/* — data-access helpers that wrap Mongoose models (userModel.js, refreshTokenModel.js, etc.).
- backend/services/* — external services helpers: [storageService.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/services/storageService.js), [supabaseStorageService.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/services/supabaseStorageService.js), [otpService.js], [qrService.js].
- backend/middlewares/* — verifyJWT, authorizeRoles, errorHandler, notFound.
- backend/sql/ — optional SQL schema used by docs or hybrid features.

Frontend important folders/files:
- frontend/src/ — app source.
  - frontend/src/services/api.js — Axios wrapper with request/response interceptors (refresh flow).
  - frontend/src/services/tokenStorage.js — stores access and refresh tokens and user in localStorage.
  - frontend/src/routes/AppRouter.jsx — route definitions and protected-route logic.
  - frontend/src/pages/ — pages for Student, Faculty, Admin, Smartboard and Auth (Login, Register, OTP), e.g. [frontend/src/pages/student/StudentUploadPage.jsx](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/frontend/src/pages/student/StudentUploadPage.jsx)
  - frontend/src/hooks/useAuth.js and frontend/src/context/AuthContext.jsx — client authentication state and helpers.
  - frontend/src/lib/supabase/* — optional Supabase client for client-side interactions.

Other useful files:
- README.md (project overview & quick start)
- backend/.env and backend/.env.local (examples; do not expose secrets)

---------------------------------------------------------------------------------------------------
2. COMPLETE APPLICATION FLOW (end-to-end)
---------------------------------------------------------------------------------------------------
High-level flow (login + request example):
User (browser) → Frontend (React) → Axios (frontend/src/services/api.js) → Backend route (e.g. /api/auth/login in [backend/routes/authRoutes.js]) → Controller (e.g. login in [backend/controllers/authController.js]) → Models (backend/models/*.js / backend/mongoModels/*.js) → MongoDB via Mongoose (backend/config/mongo.js) → Controller produces response → Frontend receives tokens, stores them in localStorage and updates UI.

Example: Student presentation upload (presigned flow):
1. Student UI (StudentUploadPage.jsx) requests a presign URL: POST /api/student/uploads/presign → handled by studentRoutes -> requestUploadUrl in [backend/controllers/studentController.js].
2. Controller verifies JWT & student role via [backend/middlewares/verifyJWT.js] and authorizeRoles.
3. Controller uses storageService.buildUploadUrl (backend/services/storageService.js) which either returns a Supabase presigned upload URL or a proxied backend upload URL depending on STORAGE_PROVIDER and SUPABASE_UPLOAD_MODE.
4. Frontend performs direct upload to Supabase signed URL or uses proxy endpoint /api/storage/upload (PUT) with an upload token.
5. After upload, frontend calls POST /api/student/uploads/complete to create an Upload record (Upload Mongo model) via the controller.
6. Upload document stored into backend/mongoModels/Upload.js. Frontend shows success.

The README and code contain several other flows (smartboard QR session, smartboard access login, admin bulk import, faculty review, etc.). See sections below for each feature.

---------------------------------------------------------------------------------------------------
3. AUTHENTICATION FLOW (exact implementation)
---------------------------------------------------------------------------------------------------
Files of interest:
- [backend/controllers/authController.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/controllers/authController.js)
- [backend/config/jwt.js] — JWT helpers (signAccessToken, signRefreshToken, verifyRefreshToken, decodeToken)
- [backend/models/refreshTokenModel.js] and [backend/mongoModels/RefreshToken.js]
- [frontend/src/services/tokenStorage.js]
- [frontend/src/services/api.js]

Mechanics and behavior:
- Registration:
  - Endpoint: POST /api/auth/register ([backend/routes/authRoutes.js] -> register controller).
  - Accepts email, password, role (default STUDENT), optional classId/classIds.
  - Only STUDENT and FACULTY may self-register (checked in controller).
  - Email format validated using role-specific regex (utils/emailRules.js). Student institutional emails must match college domain.
  - Password minimum length enforced (>=8).
  - If email not already registered (or registered but not verified), user record is created with isVerified: false and passwordHash stored (bcrypt.hash with salt rounds 12) in MongoDB (schemas in mongoModels/User.js). If existing unverified user exists, their pending record is updated.
  - An OTP (one-time password) is created and sent via the OTP service (createAndSendOtp) with purpose OTP_PURPOSES.REGISTRATION. OTP expiry configured via OTP_EXPIRY_MINUTES env var.

- OTP / Verification:
  - POST /api/auth/verify-otp validates the OTP (authController.verifyRegistrationOtp) via otpService.verifyOtp. Successful verification flips user.isVerified true.
  - resend / resend registration OTP supported: POST /api/auth/resend-otp.

- Login:
  - POST /api/auth/login accepts identifier (email or roll number) or email and password. Controller: authController.login.
  - verifyJWT NOT required for login. Rate limiting applies via express-rate-limit in authRoutes (loginLimiter) with environment-controlled thresholds.
  - Passwords compared using bcrypt.compare. Smartboard role cannot login with password.
  - On successful login: signAccessToken(payload) and signRefreshToken(payload) are called.
    - Access tokens: short-lived JWT (expiry configured by ACCESS_TOKEN_EXPIRY env).
    - Refresh tokens: long-lived JWT (REFRESH_TOKEN_EXPIRY env). The refresh token is hashed (hashToken) and stored in RefreshToken collection (mongoModels/RefreshToken.js) with expiresAt timestamp using saveRefreshToken.
  - Response contains accessToken, refreshToken, and user profile payload. Frontend stores tokens and user in localStorage via setAuthSession (frontend/src/services/tokenStorage.js).

- Access token refresh:
  - Endpoint: POST /api/auth/refresh. The controller verifies the refresh token using verifyRefreshToken, then checks the stored hashed token in DB via getRefreshToken(hashToken(refreshToken)). If valid and not expired, a new accessToken is signed and returned.
  - If refresh token expired or revoked, an error 401 is returned.

- Logout:
  - POST /api/auth/logout expects { refreshToken } in body. The controller deletes (revokes) the hashed refresh token from DB (deleteRefreshToken) and responds HTTP 204. Frontend clears localStorage.

- Password reset and forgot password:
  - POST /api/auth/forgot-password triggers OTP generation for password reset (OTP_PURPOSES.PASSWORD_RESET) if account exists and verified (smartboard excluded).
  - POST /api/auth/reset-password requires email, otp, newPassword — validate OTP via verifyOtp, then bcrypt.hash the new password and update user password; delete existing refresh tokens for the user (deleteUserRefreshTokens).

- Token storage on frontend:
  - accessToken, refreshToken, and serialized user stored in localStorage keys: cmr_access_token, cmr_refresh_token, cmr_user (frontend/src/services/tokenStorage.js).
  - Axios request interceptor attaches Authorization header with access token. Response interceptor handles 401 by calling POST /api/auth/refresh with the refreshToken from localStorage, then retries the original request if refresh succeeds (frontend/src/services/api.js).

- Authentication middleware:
  - [backend/middlewares/verifyJWT.js] validates access token and sets req.user (userId and role). Other middlewares include authorizeRoles(...roles) which checks req.user.role against expected roles.

- OTPs and purposes: registration, password reset, smartboard login. OTPs managed by backend/services/otpService and mongoModels/OtpCode.js.

Session expiration and revocation:
- Access tokens are short-lived JWTs; refresh tokens stored hashed in DB and can be deleted to revoke.
- Logout deletes refresh token. Password reset deletes all refresh tokens for user (force re-login).

Cookies: No HTTP cookies are used for authentication in current implementation. Tokens are passed in Authorization headers; frontend stores tokens in localStorage.

---------------------------------------------------------------------------------------------------
4. USER ROLES (explicit roles in code)
---------------------------------------------------------------------------------------------------
Roles implemented (from User schema enum [backend/mongoModels/User.js] and constants):
- ADMIN
- FACULTY
- STUDENT
- SMARTBOARD

For each role (summary):

1) ADMIN
- Login: Email/password via /api/auth/login (must be isVerified). Admin password login supported like other roles.
- Dashboard / UI: frontend admin pages under frontend/src/pages/admin/*. Example: [AdminDashboardPage.jsx].
- Permissions: full access to admin routes (protected via authorizeRoles(ROLES.ADMIN) in backend/routes/adminRoutes.js).
- Pages: Users management, Departments, Classes, Subjects, Smartboard settings, Analytics, Uploads, Bulk imports.
- DB access: can query Users, Uploads, Departments, Classes, Subjects, SmartboardSettings.
- Actions: create/update/delete users, departments, classes, subjects; upload templates; download uploads zip; send bulk mail; manage smartboards.

2) FACULTY
- Login: Email/password via /api/auth/login (must be isVerified).
- Dashboard: frontend/src/pages/faculty/* (FacultyDashboardPage.jsx, FacultyPresentationReviewPage.jsx, FacultyMaterialsPage.jsx).
- Permissions: protect faculty routes via authorizeRoles(ROLES.FACULTY); can act on presentations, create lecture materials, review student presentations, create announcements.
- DB access: View and manage Uploads (their own and subject/class-scoped), Subjects assigned, Classes.
- Actions: request presigned upload for lecture materials, complete uploads, review presentations (approve/reject with feedback), create announcements.

3) STUDENT
- Login: Email or roll-number + password via /api/auth/login (must be isVerified and have STUDENT role).
- Dashboard/UI: frontend/src/pages/student/* (StudentHomePage.jsx, StudentUploadPage.jsx, StudentPresentationsPage.jsx, StudentProfilePage.jsx).
- Permissions: can upload presentations (presign -> upload -> complete flow), update profile, request presentation replacement, view subjects and notifications.
- DB access: Their own Upload documents, profile (User document), class relations.
- Actions: request upload URL, complete upload, update presentation meta (title/description), delete presentation, replace presentation.

4) SMARTBOARD
- Login: Smartboard devices use special flows (smartboardAccessLogin) not password login.
- Smartboard flows: can create a session (POST /api/auth/smartboard/session) from faculty UI; smartboard scans QR to authorize and exchange tokens.
- Permissions: SMARTBOARD role used for device-to-server interactions; authorizeRoles allows SMARTBOARD role to access library and file URLs.
- DB access: limited; smartboard token maps to SmartboardSession and is authorized to list library objects or fetch signed URLs.

Note: Many endpoints accept both ADMIN and FACULTY depending on function. Authorization performed via authorizeRoles middleware in each route file.

---------------------------------------------------------------------------------------------------
5. ALL FEATURES (major features & details)
---------------------------------------------------------------------------------------------------
The list below covers major features implemented in code. Each feature lists route(s), frontend pages, DB collections involved, and CRUD operations.

Feature: Registration & OTP verification
- Purpose: Allow student/faculty self-registration with OTP email verification.
- Roles: STUDENT, FACULTY
- Frontend: /register (frontend/src/pages/RegisterPage.jsx), /verify-otp (VerifyOtpPage.jsx)
- API:
  - POST /api/auth/register -> authController.register
  - POST /api/auth/verify-otp -> authController.verifyRegistrationOtp
  - POST /api/auth/resend-otp -> authController.resendRegistrationOtp
- DB: mongoModels/User (users collection), mongoModels/OtpCode
- Create: creates user doc (isVerified: false), creates OTP record
- Read: getUserByEmail
- Update: updatePendingUser or markUserAsVerified
- Delete: n/a
- Validation: email format by role, password length, classId validity
- Error handling: 400/403/409 depending on validation and state

Feature: Login (Access + Refresh tokens)
- Purpose: Authenticated access via JWTs
- Roles: ADMIN/ FACULTY/ STUDENT
- Frontend: /login (LoginPage.jsx)
- API: POST /api/auth/login -> signAccessToken + signRefreshToken, save hashed refresh token in DB
- DB: RefreshToken collection (mongoModels/RefreshToken)
- Create: save refresh token (hashed) record
- Read: getUserByLoginIdentifier
- Update: markUserLogin updates lastLoginAt
- Delete: logout removes refresh token
- Validation: password via bcrypt
- Error handling: 401 for invalid credentials, 403 for unverified accounts

Feature: Refresh access token
- API: POST /api/auth/refresh -> validate refresh token signature and stored hash, issue new access token
- Validation: check stored hashed token and expiry in DB

Feature: Password reset
- API: POST /api/auth/forgot-password -> creates OTP (PASSWORD_RESET)
       POST /api/auth/reset-password -> verify OTP, change passwordHash, delete refresh tokens
- Frontend: ForgotPasswordPage.jsx

Feature: Student upload (presentations)
- Purpose: Students upload PPT/PDF presentations for review/sharing
- Roles: STUDENT
- Frontend: StudentUploadPage.jsx, StudentPresentationsPage.jsx
- API:
  - POST /api/student/uploads/presign -> requestUploadUrl (returns upload URL and upload token)
  - POST /api/student/uploads/complete -> completeStudentPresentationUpload (creates Upload document)
  - PUT /api/student/presentations/:presentationId -> update metadata
  - DELETE /api/student/presentations/:presentationId -> delete presentation
- DB: Uploads collection (mongoModels/Upload)
- Create operation: complete endpoint inserts Upload doc (uploadedBy userId, subjectId, s3Key, fileUrl, fileName, fileType, category)
- Read operation: GET /api/student/uploads and GET /api/student/presentations
- Update: updateStudentPresentation to change title/description
- Delete: deleteStudentPresentation removes record and optionally storage (depending on storageService behavior)
- File upload: either direct to Supabase signed URL or backend-proxied PUT /api/storage/upload with an upload token (storageRoutes.js)

Feature: Faculty materials
- Purpose: Faculty upload lecture materials and share
- Roles: FACULTY
- Frontend: FacultyMaterialsPage.jsx
- API:
  - POST /api/faculty/materials/presign -> requestLectureMaterialUploadUrl
  - POST /api/faculty/materials/complete -> completeLectureMaterialUpload
  - GET /api/faculty/materials -> getFacultyLectureMaterials
- DB: Uploads collection (category: LECTURE_MATERIAL)

Feature: Faculty presentation review
- Purpose: Faculty review student-submitted presentations (approve/reject + feedback)
- Roles: FACULTY
- Frontend: FacultyPresentationReviewPage.jsx
- API: PUT /api/faculty/presentations/:presentationId/review -> reviewFacultyPresentation
- DB: Uploads collection fields status (PENDING, UPLOADED, APPROVED, REJECTED), feedback, reviewedBy, reviewedAt

Feature: Smartboard pairing and session (QR flow)
- Purpose: Pair smartboard device with a faculty session via QR and exchange temporary token for access
- Roles: FACULTY, SMARTBOARD, ADMIN (for settings)
- Frontend: SmartboardConnectPage.jsx, SmartboardAuthorizePage.jsx, SmartboardViewPage.jsx
- API:
  - POST /api/auth/smartboard/session -> createSmartboardSession (returns sessionToken and QR data URL)
  - POST /api/auth/smartboard/authorize -> faculty authorizes session (requires verifyJWT + authorizeRoles(FACULTY or ADMIN))
  - POST /api/auth/smartboard/exchange -> smartboard polls to exchange session token for access token
  - POST /api/auth/smartboard/access-login -> smartboard access login using accessUser+accessKey (returns accessToken)
  - POST /api/auth/smartboard/request-otp and POST /api/auth/smartboard/verify-otp support OTP-based pairing
- DB: SmartboardSession (mongoModels/SmartboardSession)

Feature: Admin management & bulk import
- Purpose: Admin can manage users, departments, classes, subjects, and import CSV/XLSX files
- Roles: ADMIN
- Frontend: admin pages under frontend/src/pages/admin/
- API: multiple endpoints under /api/admin/* implemented in backend/routes/adminRoutes.js (createUserByAdmin, bulkImportUsersByAdmin, bulkImportAcademicByAdmin, createDepartment/Class/Subject, getAnalytics, getUsers, getUploads, download uploads zip, manage smartboards)
- File upload: multer used in admin routes to accept CSV/XLSX templates (file size limited and filtered by extension)

---------------------------------------------------------------------------------------------------
6. API DOCUMENTATION (list of endpoints implemented in code)
---------------------------------------------------------------------------------------------------
This list is derived from the route files in backend/routes/*.js. For each route file the endpoints are grouped by role and purpose. Authentication: access token required (verifyJWT) where routes call verifyJWT; specific role(s) enforced by authorizeRoles.

Auth endpoints (backend/routes/authRoutes.js):
- POST /api/auth/register — Register (STUDENT or FACULTY) — public
- POST /api/auth/verify-otp — Verify registration OTP — public
- POST /api/auth/resend-otp — Resend registration OTP — public
- POST /api/auth/student-setup — Complete student setup (profile) — public
- GET /api/auth/student-setup/options — Options for student setup (departments/classes)
- POST /api/auth/faculty-setup — Complete faculty setup
- GET /api/auth/faculty-setup/options — Guidance for faculty setup
- POST /api/auth/forgot-password — Request password reset OTP
- POST /api/auth/reset-password — Reset password via OTP
- POST /api/auth/login — Login (identifier/email + password)
- POST /api/auth/refresh — Refresh access token (body: refreshToken)
- POST /api/auth/logout — Logout (body: refreshToken) — public

Smartboard-related (authRoutes):
- POST /api/auth/smartboard/session — Create QR session (public)
- POST /api/auth/smartboard/access-login — Smartboard access login (accessUser + accessKey) — public
- POST /api/auth/smartboard/authorize — Faculty-authorize smartboard session — verifyJWT + authorizeRoles(FACULTY, ADMIN)
- POST /api/auth/smartboard/request-otp — Request smartboard OTP to faculty email
- POST /api/auth/smartboard/verify-otp — Verify OTP for smartboard session
- POST /api/auth/smartboard/exchange — Exchange sessionToken for smartboard access token
- GET /api/auth/smartboard/library — Get smartboard library (verifyJWT + authorizeRoles SMARTBOARD, FACULTY, ADMIN)

Student endpoints (backend/routes/studentRoutes.js) — all routes use verifyJWT + authorizeRoles(STUDENT):
- GET /api/student/home
- GET /api/student/dashboard
- GET /api/student/subjects
- GET /api/student/uploads (presentations)
- GET /api/student/presentations
- GET /api/student/notifications
- GET /api/student/activity
- GET /api/student/profile
- POST /api/student/uploads/presign — Request presigned upload URL
- POST /api/student/presentations/presign — same as presign
- POST /api/student/uploads/complete — completeStudentPresentationUpload
- POST /api/student/presentations/complete
- POST /api/student/presentations/:presentationId/replace-presign
- POST /api/student/presentations/:presentationId/replace-complete
- PUT /api/student/presentations/:presentationId
- DELETE /api/student/presentations/:presentationId
- PUT /api/student/profile
- PUT /api/student/profile/password

Faculty endpoints (backend/routes/facultyRoutes.js) — verifyJWT + authorizeRoles(FACULTY):
- GET /api/faculty/dashboard
- GET /api/faculty/classes
- GET /api/faculty/subjects
- GET /api/faculty/subjects/:subjectId/students
- GET /api/faculty/presentations
- PUT /api/faculty/presentations/:presentationId/review
- POST /api/faculty/materials/presign
- POST /api/faculty/materials/complete
- GET /api/faculty/materials
- GET /api/faculty/students
- GET /api/faculty/notifications
- POST /api/faculty/notifications
- GET /api/faculty/profile
- PUT /api/faculty/profile
- PUT /api/faculty/profile/password
- GET /api/faculty/smartboard/summary

Admin endpoints (backend/routes/adminRoutes.js) — verifyJWT + authorizeRoles(ADMIN):
- GET /api/admin/analytics
- GET /api/admin/users
- GET /api/admin/departments
- GET /api/admin/classes
- GET /api/admin/subjects
- GET /api/admin/uploads
- GET /api/admin/downloads/uploads-zip
- GET /api/admin/templates/academic
- GET /api/admin/templates/users
- GET /api/admin/settings/mail
- GET /api/admin/settings/smartboard
- PUT /api/admin/settings/smartboard
- GET /api/admin/settings/smartboards
- POST /api/admin/settings/smartboards
- PUT /api/admin/settings/smartboards/:id
- DELETE /api/admin/settings/smartboards/:id
- GET /api/admin/announcements
- POST /api/admin/departments
- POST /api/admin/classes
- POST /api/admin/subjects
- POST /api/admin/subjects/bulk
- POST /api/admin/users
- POST /api/admin/users/bulk-import (file upload via multer)
- POST /api/admin/academic/bulk-import (file upload)
- POST /api/admin/settings/mail/test
- POST /api/admin/mail/send
- POST /api/admin/announcements
- PUT /api/admin/departments/:departmentId
- PUT /api/admin/classes/:classId
- PUT /api/admin/subjects/:subjectId
- PUT /api/admin/users/:userId
- PUT /api/admin/settings/mail
- DELETE /api/admin/departments/:departmentId
- DELETE /api/admin/classes/:classId
- DELETE /api/admin/subjects/:subjectId
- DELETE /api/admin/users/:userId

Storage endpoints (backend/routes/storageRoutes.js):
- PUT /api/storage/upload — Backend proxied upload endpoint (requires upload token in query or X-Upload-Token header); used when STORAGE_PROVIDER=local or SUPABASE_UPLOAD_MODE=proxy
- GET /api/storage/url — Create presigned download URL (verifyJWT required)
- GET /api/storage/list — List objects under prefix (verifyJWT required)
- GET /api/storage/file-url — Return signed file URL for a stored upload by uploadId (verifyJWT required; role-based owner check)

Supabase helper endpoints (backend/routes/supabaseRoutes.js) may exist for storage helper or admin operations. See file for specifics.

---------------------------------------------------------------------------------------------------
7. DATABASE (actual implementation)
---------------------------------------------------------------------------------------------------
- Database type: MongoDB (Mongoose). The repo uses Mongoose models under backend/mongoModels.
- Connection: backend/config/mongo.js reads environment variable MONGO_URI (or MONGODB_URI) and connects via mongoose.connect. It also handles DNS fallbacks.
- Configuration: via environment variables in backend/.env or .env.local — see README and config files.

Collections and main Mongoose models (file paths included):
- users — [backend/mongoModels/User.js]
  - Fields: name, email, passwordHash, role (enum ADMIN/FACULTY/STUDENT/SMARTBOARD), rollNumber, branch, year, section, mobile, profilePhoto, classId (ref Class), isVerified, lastLoginAt, timestamps
  - Indexes: unique email, role, partial unique rollNumber
- uploads — [backend/mongoModels/Upload.js]
  - Fields: uploadedBy (ref User), subjectId (ref Subject), s3Key (storage key), fileUrl (public or signed), title, description, fileName, fileType, category (STUDENT_PRESENTATION, LECTURE_MATERIAL), status (PENDING, UPLOADED, APPROVED, REJECTED), feedback, reviewedBy, reviewedAt
  - Indexes: uploadedBy, subjectId, category+status
- smartboardSessions — [backend/mongoModels/SmartboardSession.js]
  - Fields: sessionToken, smartboardName, authorizedBy (User ref), classIds (array of Class refs), status (PENDING/AUTHORIZED/EXPIRED), expiresAt, authorizedAt
- refreshTokens — [backend/mongoModels/RefreshToken.js]
  - Stores hashed refresh token for revocation with userId, tokenHash, expiresAt
- subject, class, department — [backend/mongoModels/Subject.js], Class.js, Department.js: academic metadata and relationships
- otpCodes — [backend/mongoModels/OtpCode.js] — OTP records with purpose and expiry

Relationships (examples present in code):
- User (faculty/student) -> Class (classId) (User.classId points to Class._id)
- Class -> Subject (Subject.classId)
- Upload -> User (uploadedBy), Upload -> Subject (subjectId)
- SmartboardSession.authorizedBy -> User (faculty)

Which APIs use which collections: controllers in backend/controllers/*.js directly query these Mongoose models. E.g., authController uses User, SmartboardSession, Upload, Subject, Class, Department.

---------------------------------------------------------------------------------------------------
8. DATA FLOW (example traces linking frontend → api → controller → service → DB → response)
---------------------------------------------------------------------------------------------------
Example 1: Student profile fetch
- Frontend: StudentProfilePage.jsx triggers GET /api/student/profile
- Axios: frontend/src/services/api.js sends Authorization: Bearer <accessToken>
- Route: [backend/routes/studentRoutes.js] maps GET /profile to studentController.getStudentProfile
- Controller: backend/controllers/studentController.js → calls userModel.getUserById or mongo query via mongoModels/User.js
- DB: MongoDB findById on users collection
- Response: JSON user object sent to frontend

Example 2: Request presigned upload URL (student)
- Frontend: StudentUploadPage.jsx POST /api/student/uploads/presign (requestUploadUrl)
- Route: backend/routes/studentRoutes.js -> controller studentController.requestUploadUrl
- Controller uses storageService.buildUploadUrl (backend/services/storageService.js)
  - storageService either requests Supabase signed URL (supabaseStorageService.createPresignedUploadUrl) or returns proxy URL referencing /api/storage/upload?token=<uploadToken>
- Response: upload URL returned to frontend
- Frontend: Uploads file directly to Supabase signed URL (or PUTs to /api/storage/upload with token). If proxied, backend/storageRoutes.upload reads stream and uploads to Supabase via supabaseStorageService.uploadObjectStream or writes local file when provider=local.
- After upload, frontend calls POST /api/student/uploads/complete to create Upload doc: controller inserts into mongoModels/Upload.js

Files involved: frontend/src/pages/student/StudentUploadPage.jsx → frontend/src/services/api.js → backend/routes/studentRoutes.js → backend/controllers/studentController.js → backend/services/storageService.js / backend/services/supabaseStorageService.js → mongoModels/Upload.js → MongoDB

---------------------------------------------------------------------------------------------------
9. FILE UPLOADS AND STORAGE
---------------------------------------------------------------------------------------------------
Storage providers supported (code):
- Supabase Storage — preferred (backend/services/supabaseStorageService.js) using SUPABASE_SERVICE_ROLE_KEY server-side to create signed URLs, upload objects, list objects.
- Local filesystem — backend/services/storageService.getLocalUploadDir() and direct file writes when STORAGE_PROVIDER=local.

Upload modes:
- Presigned (default for Supabase): server returns a presigned upload URL; client uploads directly to Supabase. Implementation: supabaseStorageService.createPresignedUploadUrl
- Proxy (proxy upload): when SUPABASE_UPLOAD_MODE=proxy or STORAGE_PROVIDER=local, the server issues an upload token (signed JWT) and the client PUTs to backend endpoint /api/storage/upload with the upload token passed as query param or X-Upload-Token header. The backend validates the upload token (verifyUploadToken from backend/config/jwt.js), streams the request and uploads to Supabase or writes to local file system depending on provider.

Where tokens and keys are stored:
- SUPABASE_SERVICE_ROLE_KEY — required server-side environment variable for signed URL creation and uploads (backend/services/supabaseStorageService.js warns if missing).

File lifecycle and signed download URLs:
- Files stored in Supabase bucket with key (s3Key or fullPath). To download securely, backend can create a presigned download URL via storageService.createPresignedDownloadUrl (which calls supabaseStorageService.createPresignedDownloadUrl).
- The storageRoutes GET /file-url returns a signed URL for an Upload record after verifying the requestor has permission: Admin/Faculty/Smartboard allowed for all files, Students allowed for their own uploads only.

File deletion: Controllers that delete Uploads (student delete or admin delete) may delete DB doc; actual storage deletion is performed by storageService or supabase service depending on implementation (check delete logic in corresponding controller).

Supported file types: PPT/PPTX, PDF, documents. Admin import uses multer to accept CSV/XLSX.

---------------------------------------------------------------------------------------------------
10. FRONTEND PAGES (important pages)
---------------------------------------------------------------------------------------------------
Files are listed under frontend/src/pages. Important pages with routes (as implemented in AppRouter.jsx and navConfig.js):
- Auth & onboarding:
  - [frontend/src/pages/LoginPage.jsx] — /login
  - [frontend/src/pages/RegisterPage.jsx] — /register
  - [frontend/src/pages/VerifyOtpPage.jsx] — /verify-otp
  - [frontend/src/pages/ForgotPasswordPage.jsx] — /forgot-password
  - [frontend/src/pages/StudentSetupPage.jsx] — /student-setup
  - [frontend/src/pages/FacultySetupPage.jsx] — /faculty-setup
- Student:
  - [frontend/src/pages/student/StudentHomePage.jsx] — /student/home or /student/dashboard
  - StudentUploadPage.jsx — /student/uploads/new (presign flow)
  - StudentPresentationsPage.jsx — /student/presentations
  - StudentProfilePage.jsx — /student/profile
  - StudentSubjectsPage.jsx — /student/subjects
  - StudentNotificationsPage.jsx — /student/notifications
  - StudentActivityPage.jsx — /student/activity
- Faculty:
  - FacultyDashboardPage.jsx — /faculty/dashboard
  - FacultyPresentationReviewPage.jsx — /faculty/presentations/review
  - FacultyMaterialsPage.jsx — /faculty/materials
  - FacultySubjectsPage.jsx, FacultyStudentsPage.jsx, FacultyClassesPage.jsx
  - FacultyProfilePage.jsx — profile & change password
- Admin:
  - AdminDashboardPage.jsx — /admin/dashboard
  - AdminUsersPage.jsx — /admin/users (create/update/delete user)
  - AdminDepartmentsPage.jsx — /admin/departments
  - AdminClassesPage.jsx — /admin/classes
  - AdminSubjectsPage.jsx — /admin/subjects
  - AdminUploadsPage.jsx — /admin/uploads
  - SmartboardsPage.jsx — /admin/settings/smartboards
  - AdminSettingsPage.jsx — /admin/settings
  - AdminAnalyticsPage.jsx — /admin/analytics
- Smartboard:
  - SmartboardConnectPage.jsx — UI for pairing device and scanning QR
  - SmartboardAuthorizePage.jsx — verifying session on faculty side
  - SmartboardViewPage.jsx — presentation display UI

Each page calls the backend via frontend/src/services/api.js and uses tokenStorage for session.

---------------------------------------------------------------------------------------------------
11. BACKEND STRUCTURE (request handling)
---------------------------------------------------------------------------------------------------
- Entry points: [backend/server.js] loads env then calls connectMongo(), then imports app from [app.js] and listens.
- app.js sets up middleware: helmet, cors, morgan logging, express.json, rateLimit, static files (files/ for local storage), route mounting and SPA fallback if SERVE_FRONTEND.
- Routes: backend/routes/* map to controllers in backend/controllers/* . Router files also apply role-based middleware verifyJWT and authorizeRoles where required.
- Controllers: implement request validation, call model layer (backend/models/*) or directly mongoModels/*, call services (storageService, otpService, qrService), handle responses and errors. Example: backend/controllers/authController.js.
- Services: implement external integrations (supabaseStorageService, otpService, qrService). storageService abstracts local vs supabase.
- Models: backend/models/*.js implement data-access patterns using Mongoose models (mongoModels/*.js). e.g., userModel.createUser wraps User.create.
- Middlewares:
  - verifyJWT: checks Authorization header, validates access token, attaches req.user
  - authorizeRoles(...roles): checks req.user.role against allowed roles
  - errorHandler: central error middleware to transform ApiError and internal errors into JSON responses
  - notFound: 404 handler for missing API routes.

Request flow example: GET /api/student/uploads
- app.js → router mounting for /api/student → studentRoutes uses verifyJWT + authorizeRoles(STUDENT) → studentController.getStudentUploads → model queries Upload collection and returns documents → controller returns JSON.

---------------------------------------------------------------------------------------------------
12. IMPORTANT BUSINESS LOGIC (rules found in code)
---------------------------------------------------------------------------------------------------
- Registration: Only STUDENT and FACULTY may self-register; email must match role-specific institutional patterns. Student roll number must adhere to regex when setting up.
- OTP verification: OTP has expiry; registration incomplete until OTP verified. Resend logic present with cooldown controlled by OTP service and env vars.
- Passwords: Stored as bcrypt.hash(password, 12).
- Tokens: Access token is JWT for API auth. Refresh tokens stored hashed in DB for revocation. On password reset, all refresh tokens for user are deleted.
- Smartboard pairing: Faculty must authorize smartboard sessions. Smartboard session flows support (a) global accessUser/accessKey, (b) class-specific smartboard key, (c) OTP-based pairing to a faculty email. Sessions have short expiry (SMARTBOARD_QR_EXPIRES_MINUTES).
- Uploads: Only authorized tokens and users may create or request signed URLs. storageRoutes enforces allowed purposes in proxied uploads (student_presentation_upload, student_presentation_replace, faculty_material_upload). Content-Type must match token claim.
- File access control: storageRoutes GET /file-url validates that admin/faculty/smartboard can access any file while students may access only uploads they own (uploadedBy matches user id).
- Review workflow: Student submissions stored with status (UPLOADED default), faculty can change status to APPROVED/REJECTED and attach feedback; uploadSchema contains reviewedBy and reviewedAt fields.
- Admin bulk actions: Admin may upload CSV/XLSX; multer filters extension and file size.

---------------------------------------------------------------------------------------------------
13. CONFIGURATION (where env variables are used)
---------------------------------------------------------------------------------------------------
Configuration primarily via backend/.env and optional backend/.env.local (loaded by server.js). Key values used in code:
- MONGO_URI (or MONGODB_URI) — Configured through environment variable: MONGO_URI
- PORT — Configured through environment variable: PORT
- JWT secrets and expiry: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY
- SUPABASE_*: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server side), SUPABASE_STORAGE_BUCKET — Configured through environment variables
- STORAGE_PROVIDER — "supabase" (default) or "local" — Configured through environment variable: STORAGE_PROVIDER
- SUPABASE_UPLOAD_MODE — "presigned" or "proxy" — Configured through environment variable: SUPABASE_UPLOAD_MODE
- SMTP_* and MAIL_PROVIDER — Configured through environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_PROVIDER
- SMARTBOARD_* — SMARTBOARD_ACCESS_USER, SMARTBOARD_ACCESS_KEY, SMARTBOARD_DEFAULT_FACULTY_EMAIL, SMARTBOARD_DEFAULT_FACULTY_ID — Configured through environment variables
- CORS_ORIGINS and STRICT_DEV_CORS — control CORS in app.js

Do NOT include any secret values here — they are read from environment variables. The README and supabase service file also document that SUPABASE_SERVICE_ROLE_KEY must remain server-only.

---------------------------------------------------------------------------------------------------
14. ERROR HANDLING (how different error cases are handled)
---------------------------------------------------------------------------------------------------
- Invalid login (wrong credentials): authController.login throws ApiError(401, "Invalid credentials") — handled by centralized errorHandler to produce JSON with status and message.
- Unauthorized requests (missing/invalid access token): verifyJWT returns 401 errors; frontend interceptor forces refresh or clears session.
- Forbidden requests (role mismatch): authorizeRoles returns 403 ("Forbidden role") when role checks fail; storageRoutes/file-url returns 403 if student requests a file not owned by them.
- Missing data: controllers validate required fields and throw ApiError(400, "field is required")
- Validation errors: controllers check data shapes and regexes and throw 400/409 depending on condition (e.g., roll number uniqueness returns 409 from Mongo duplicate key error caught and mapped in controller).
- Database errors: Mongo duplicate key error code 11000 is caught in controllers where relevant and mapped to 409 with friendly message (e.g., rollNumber already exists). Unexpected DB errors bubble up to errorHandler.
- Upload errors (proxy upload): storageRoutes createByteLimitTransform and writeRequestToFile enforce max bytes and return 413 File size exceeds limit. It also validates upload tokens and content-type match.
- Server errors: centralized errorHandler returns 500 for uncaught exceptions with safe messaging. Errors include HTTP code and message via ApiError wrapper where used.

---------------------------------------------------------------------------------------------------
15. COMPLETE FEATURE MAP (concise flow + table)
---------------------------------------------------------------------------------------------------
Typical flow:
USER (Browser) → FRONTEND (React & Axios) → API (Express routes) → AUTH (verifyJWT / authorizeRoles) → BACKEND LOGIC (controllers & services) → DATABASE (MongoDB via Mongoose) → STORAGE (Supabase or local) → RESPONSE → FRONTEND UI

Feature table (condensed)
Feature | Frontend Page | API | Backend Controller | Database | Storage
---|---|---|---|---|---
Registration & OTP | /register, /verify-otp | POST /api/auth/register, /verify-otp | authController.register/verifyRegistrationOtp | users, otpCodes | n/a
Login & Tokens | /login | POST /api/auth/login | authController.login | users, refreshTokens | n/a
Student Uploads | /student/uploads | POST /api/student/uploads/presign POST /api/student/uploads/complete | studentController.requestUploadUrl/completeStudentPresentationUpload | uploads | Supabase/local via storageService
Faculty Review | /faculty/presentations | PUT /api/faculty/presentations/:id/review | facultyController.reviewFacultyPresentation | uploads | n/a
Smartboard pairing | SmartboardConnect | POST /api/auth/smartboard/session /exchange /authorize | authController.createSmartboardSession, exchangeSmartboardSession | smartboardSessions | n/a
Admin Management | /admin/* | /api/admin/* | adminController.* | users, classes, departments, subjects, uploads | n/a

---------------------------------------------------------------------------------------------------
16. MOBILE APP REFERENCE
---------------------------------------------------------------------------------------------------
Notes for a future Flutter developer building a mobile client without changing the backend:
- Reusable APIs: All APIs under /api/* (auth, student, faculty, admin, storage) are RESTful and can be called from mobile. Use the same endpoints and payloads.
- Authentication mechanism: Reuse access token (short-lived JWT) and refresh token flow. Mobile should store tokens securely (secure storage, not plain localStorage). On 401, call POST /api/auth/refresh with refreshToken, then retry failed request.
- Database: MongoDB remains the backend database (no change). Mobile will not access DB directly.
- User roles: ADMIN, FACULTY, STUDENT, SMARTBOARD — the mobile client must send role info where required but role validation is enforced server-side.
- File upload mechanism: Prefer presigned upload flow (server returns signed upload URL). Mobile can upload files (PPT/PDF) directly to Supabase using the provided signed URL. If the backend is configured to use proxy mode, mobile must PUT file stream to /api/storage/upload with the upload token.
- Smartboard pairing: Mobile can reuse smartboard session flow for scanning QR codes or initiating sessions by calling POST /api/auth/smartboard/session and participating in the same token exchange flows.
- Important dependencies: Mail/OTP behavior — OTPs are sent to institutional emails; mobile must implement OTP entry UIs. The smartboard flows require short-polling or event-driven exchange for sessionToken authorization.
- Error handling: Follow the same error codes (400/401/403/409/410/500) and show user-friendly messages accordingly. Implement logout to call POST /api/auth/logout and clear refresh tokens on server (send refreshToken in body).

---------------------------------------------------------------------------------------------------
References (local files used for this documentation):
- [backend/app.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/app.js)
- [backend/server.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/server.js)
- [backend/controllers/authController.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/controllers/authController.js)
- [backend/routes/authRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/authRoutes.js)
- [backend/routes/studentRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/studentRoutes.js)
- [backend/routes/facultyRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/facultyRoutes.js)
- [backend/routes/adminRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/adminRoutes.js)
- [backend/routes/storageRoutes.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/routes/storageRoutes.js)
- [backend/services/storageService.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/services/storageService.js)
- [backend/services/supabaseStorageService.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/services/supabaseStorageService.js)
- [backend/mongoModels/User.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/mongoModels/User.js)
- [backend/mongoModels/Upload.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/backend/mongoModels/Upload.js)
- [frontend/src/services/api.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/frontend/src/services/api.js)
- [frontend/src/services/tokenStorage.js](C:/Users/ABHIRAM/Downloads/jayanth/jayanth/presentation/cmrcet/frontend/src/services/tokenStorage.js)
- [frontend/src/pages] (many pages — student, faculty, admin, smartboard pages)

---------------------------------------------------------------------------------------------------
If more detail is required (for example: per-endpoint request/response JSON examples, listing every controller function line-by-line, or an exportable OpenAPI specification), say which subset to expand and the documentation will be extended to include exact request/response JSON payloads and controller file references.

Generated by: AI assistant using Copilot CLI runtime in VS Code.
