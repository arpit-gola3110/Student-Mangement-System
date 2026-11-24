# Student Management System (SMS)
## Document 11: Security Plan, Hardening & Compliance Architecture

---

### 1. Security Architecture Principles

Security in the Student Management System is constructed using a **Defense-in-Depth** model. Security controls operate across multiple distinct tiers:
1. **Transport Security:** TLS 1.3 / HTTPS encryption everywhere.
2. **Perimeter Security:** Reverse proxy headers, rate limiting, and strict Cross-Origin Resource Sharing (CORS).
3. **Application & Route Security:** Stateless JWT bearer tokens, role-based access control (RBAC), and schema validation.
4. **Data Isolation Security:** Tenant-level authorization ensuring zero unauthorized horizontal or vertical data traversal.
5. **Database Security:** Sanitized MongoDB query construction, parameterized object casting, and credential isolation.

---

### 2. Comprehensive Security Checklist & Implementation Standards

#### 2.1 Cryptographic Credential Protection (bcrypt)
- **Standard:** Passwords must be hashed using `bcrypt` (or `bcryptjs`) with a work factor (salt rounds) of **10 to 12**.
- **Rule:** Plaintext passwords must never be stored in MongoDB, returned in API response bodies, written to server logs, or retained in client state.
- **Mongoose Hook:** Pre-save middleware on the `User` schema automatically detects password modification and computes the salted hash prior to execution of `save()`.

#### 2.2 Stateless JSON Web Token (JWT) Security
- **Algorithm:** HMAC using SHA-256 (`HS256`) signed with a high-entropy secret (minimum 256 bits / 32 random characters).
- **Expiration Policy:** Access tokens carry a maximum validity of **24 hours**.
- **Minimal Claims:** Token payload is strictly minimized to:
  ```json
  {
    "userId": "6741a3bc8...",
    "role": "STUDENT",
    "profileId": "6741a3bc9...",
    "iat": 1732440000,
    "exp": 1732526400
  }
  ```
- **Transmission:** Client stores JWT in secure application memory (or encrypted client storage) and attaches it exclusively via standard HTTP header: `Authorization: Bearer <token>`.

#### 2.3 Strict Backend RBAC & Resource Isolation
- **Route Protection:** Express router chains require authentication and role-checking middleware on every sensitive endpoint.
  ```javascript
  router.post('/departments', verifyToken, requireRoles(['ADMIN']), createDepartment);
  ```
- **Student Data Isolation Invariant:** Authenticated students are prohibited from supplying arbitrary `studentId` query parameters. Any student querying academic records is strictly bound to `req.user.profileId`.
- **Faculty Scoping Invariant:** When a faculty user submits attendance or sessional marks, the backend queries `FacultyAssignments` to verify that the faculty member is officially allocated to that subject, semester, and section.

#### 2.4 Input Validation & Sanitization (Zod / express-validator)
- **Zero Trust on Client Input:** Every request body, URL parameter, and query parameter undergoes strict schema validation before controller business logic executes.
- **Type Coercion & Trimming:** String inputs are automatically trimmed; emails are converted to lowercase; numeric IDs and codes are strictly formatted.
- **Rejection of Unknown Fields:** Schemas reject or strip un-whitelisted fields to prevent parameter injection attacks.

#### 2.5 NoSQL Injection Prevention
- **MongoDB Query Safety:** Express automatically sanitizes incoming request objects using `express-mongo-sanitize` to strip characters that begin with `$` or contain `.`.
- **Explicit Casting:** MongoDB IDs are strictly parsed through `mongoose.Types.ObjectId(id)`. Strings passed to database queries are treated as literal values, never as executable code or filter operators (`$where`, `$regex` vulnerabilities are mitigated).

#### 2.6 Perimeter Hardening (Helmet, CORS, Rate Limiting)
- **HTTP Security Headers (`helmet`):**
  - Enforces `Strict-Transport-Security` (HSTS).
  - Configures `X-Content-Type-Options: nosniff`.
  - Configures `X-Frame-Options: DENY` (anti-clickjacking).
  - Hides `X-Powered-By: Express` header to obscure server technology.
- **CORS Whitelist:** 
  - In production, `Access-Control-Allow-Origin` is restricted strictly to the verified frontend domain on Vercel (e.g., `https://sms-aktu.vercel.app`).
  - Wildcard `*` origins are strictly blocked on authenticated routes.
- **Rate Limiting (`express-rate-limit`):**
  - `/api/auth/login`: Maximum 5 attempts per 15 minutes per IP address (protects against credential brute-forcing).
  - General API endpoints: 100 requests per minute per IP address.

#### 2.7 Sensitive Data Protection & Student PII
- **Field Exclusions:** Password hashes, internal database revision keys (`__v`), and sensitive demographic metadata are excluded from standard API responses using Mongoose projections (`select: '-password'`).
- **Audit Logging:** Administrative changes to student grades, roll-numbers, or attendance records are logged to the immutable `AuditLogs` collection.

---

### 3. Security Risk Matrix & Proposed Mitigations

| Threat / Vulnerability Vector | Severity | Probability | Proposed Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Credential Brute-Forcing** | High | High | Implement strict IP-based rate limiting on `/api/auth/login` + exponential backoff. |
| **Broken Object Level Authorization (BOLA)** | Critical | Medium | Verify resource ownership in controller: `req.user.profileId === requestedId`. |
| **Privilege Escalation** | Critical | Low | Role claim is extracted exclusively from verified server-signed JWT, never request body. |
| **NoSQL Operator Injection** | High | Medium | Middleware sanitization stripping `$` and `.` operators; strict Zod schema parsing. |
| **Cross-Site Scripting (XSS)** | High | Medium | React JSX auto-escapes string content; input sanitization on announcement rich text. |
| **Cross-Site Request Forgery (CSRF)** | Medium | Low | Use of stateless `Bearer` tokens in `Authorization` headers renders standard CSRF ineffective. |
| **Sensitive Data Exposure in Error Traces** | Medium | Medium | Centralized error handler masks stack traces in production, returning safe error messages. |
| **DDoS / API Flooding** | High | Low | Render container resource limits + Express-rate-limit throttling. |
