import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import env from '../config/env.js';
import connectDB, { closeDatabase } from '../config/db.js';
import User from '../models/User.js';

const createdUserIds = [];
let server = null;
let baseUrl = '';

let passed = 0;
let failed = 0;

const check = (condition, label, detail = '') => {
  if (condition) {
    console.log(`[PASS] ${label}`);
    passed++;
  } else {
    console.error(`[FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
};

/**
 * Simple cookie jar parser for Set-Cookie headers in Node HTTP tests.
 */
const extractCookies = (setCookieHeaders = []) => {
  const map = {};
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of list) {
    if (!header) continue;
    const [pair] = header.split(';');
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    map[name] = value;
  }
  return map;
};

const httpReq = (path, { method = 'GET', body = null, cookies = {}, headers = {} } = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const payload = body !== null ? JSON.stringify(body) : null;

    const cookieHeader = Object.entries(cookies)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const reqHeaders = { ...headers };
    if (cookieHeader) reqHeaders.Cookie = cookieHeader;
    if (payload !== null) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch { json = raw; }
          const setCookies = extractCookies(res.headers['set-cookie']);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            cookies: setCookies,
            rawSetCookie: res.headers['set-cookie'] || [],
            data: json
          });
        });
      }
    );

    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
};

const runTests = async () => {
  console.log('='.repeat(72));
  console.log('PHASE 4 AUTHENTICATION, JWT, COOKIE, CSRF & RBAC INTEGRATION SUITE');
  console.log('='.repeat(72) + '\n');

  await connectDB();

  // Clean up any leftover test users from interrupted runs
  await User.deleteMany({ email: { $regex: '^p4_.*@aktu\\.test$' } });

  const suffix = Date.now();
  const testPassword = 'TestPassword@123';

  // Provision isolated test users for all 3 roles + 1 disabled user
  const adminUser = await User.create({ email: `p4_admin_${suffix}@aktu.test`, password: testPassword, role: 'admin', isActive: true });
  const facultyUser = await User.create({ email: `p4_faculty_${suffix}@aktu.test`, password: testPassword, role: 'faculty', isActive: true });
  const studentUser = await User.create({ email: `p4_student_${suffix}@aktu.test`, password: testPassword, role: 'student', isActive: true });
  const disabledUser = await User.create({ email: `p4_disabled_${suffix}@aktu.test`, password: testPassword, role: 'student', isActive: false });
  const tempDeletedUser = await User.create({ email: `p4_deleted_${suffix}@aktu.test`, password: testPassword, role: 'student', isActive: true });
  const tempRoleChangeUser = await User.create({ email: `p4_rolechange_${suffix}@aktu.test`, password: testPassword, role: 'student', isActive: true });

  createdUserIds.push(adminUser._id, facultyUser._id, studentUser._id, disabledUser._id, tempDeletedUser._id, tempRoleChangeUser._id);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  // Step A: Initialize CSRF token
  const csrfInit = await httpReq('/api/v1/auth/csrf-token');
  const csrfCookie = csrfInit.cookies[env.CSRF_COOKIE_NAME];
  const csrfToken = csrfInit.data?.data?.csrfToken;
  check(csrfInit.status === 200 && csrfToken && csrfCookie === csrfToken, '19a. Valid CSRF token initialized via /api/v1/auth/csrf-token');

  // Test 17: Missing CSRF token
  const missingCsrfRes = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    body: { email: adminUser.email, password: testPassword }
  });
  check(missingCsrfRes.status === 403, '17. Missing CSRF token rejected with HTTP 403', `got ${missingCsrfRes.status}`);

  // Test 18: Invalid CSRF token
  const invalidCsrfRes = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: { [env.CSRF_COOKIE_NAME]: csrfCookie },
    headers: { 'X-CSRF-Token': 'tampered_invalid_csrf_token' },
    body: { email: adminUser.email, password: testPassword }
  });
  check(invalidCsrfRes.status === 403, '18. Invalid CSRF token rejected with HTTP 403', `got ${invalidCsrfRes.status}`);

  // Helper for CSRF-protected requests
  let activeCsrf = csrfToken;
  const authHeaders = () => ({ 'X-CSRF-Token': activeCsrf });
  const csrfCookies = () => ({ [env.CSRF_COOKIE_NAME]: activeCsrf });

  // Test 1: Successful Admin login
  const adminLogin = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: adminUser.email, password: testPassword }
  });
  const adminAuthCookie = adminLogin.cookies[env.COOKIE_NAME];
  const adminSetCookieHeader = adminLogin.rawSetCookie.find((h) => h.startsWith(`${env.COOKIE_NAME}=`)) || '';
  if (adminLogin.cookies[env.CSRF_COOKIE_NAME]) activeCsrf = adminLogin.cookies[env.CSRF_COOKIE_NAME];

  check(
    adminLogin.status === 200 &&
      adminLogin.data?.data?.user?.role === 'admin' &&
      Boolean(adminAuthCookie) &&
      adminSetCookieHeader.toLowerCase().includes('httponly') &&
      !adminLogin.data?.data?.token &&
      !adminLogin.data?.data?.user?.password,
    '1 & 23. Successful admin login sets HttpOnly cookie and returns safe user without token/passwordHash',
    `status=${adminLogin.status}`
  );

  // Test 2: Successful Faculty login
  const facultyLogin = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: facultyUser.email, password: testPassword }
  });
  const facultyAuthCookie = facultyLogin.cookies[env.COOKIE_NAME];
  if (facultyLogin.cookies[env.CSRF_COOKIE_NAME]) activeCsrf = facultyLogin.cookies[env.CSRF_COOKIE_NAME];
  check(facultyLogin.status === 200 && facultyLogin.data?.data?.user?.role === 'faculty' && Boolean(facultyAuthCookie), '2. Successful faculty login');

  // Test 3: Successful Student login
  const studentLogin = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: studentUser.email, password: testPassword }
  });
  const studentAuthCookie = studentLogin.cookies[env.COOKIE_NAME];
  if (studentLogin.cookies[env.CSRF_COOKIE_NAME]) activeCsrf = studentLogin.cookies[env.CSRF_COOKIE_NAME];
  check(studentLogin.status === 200 && studentLogin.data?.data?.user?.role === 'student' && Boolean(studentAuthCookie), '3. Successful student login');

  // Test 4: Incorrect password
  const badPass = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: studentUser.email, password: 'WrongPassword@999' }
  });
  check(badPass.status === 401 && badPass.data?.message === 'Invalid email or password', '4. Incorrect password rejected with generic HTTP 401');

  // Test 5: Unknown email (same generic message!)
  const unknownEmail = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: `nonexistent_${suffix}@aktu.test`, password: testPassword }
  });
  check(unknownEmail.status === 401 && unknownEmail.data?.message === badPass.data?.message, '5. Unknown email returns identical generic HTTP 401 (no account enumeration)');

  // Test 6: Missing email
  const missingEmail = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { password: testPassword }
  });
  check(missingEmail.status === 422, '6. Missing email rejected with HTTP 422', `got ${missingEmail.status}`);

  // Test 7: Missing password
  const missingPass = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: studentUser.email }
  });
  check(missingPass.status === 422, '7. Missing password rejected with HTTP 422', `got ${missingPass.status}`);

  // Test 8: Malformed email
  const malformedEmail = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: 'not-a-valid-email', password: testPassword }
  });
  check(malformedEmail.status === 422, '8. Malformed email rejected with HTTP 422', `got ${malformedEmail.status}`);

  // Test 9: Disabled user
  const disabledRes = await httpReq('/api/v1/auth/login', {
    method: 'POST',
    cookies: csrfCookies(),
    headers: authHeaders(),
    body: { email: disabledUser.email, password: testPassword }
  });
  check(disabledRes.status === 401, '9. Disabled user login rejected with HTTP 401', `got ${disabledRes.status}`);

  // Test 10: Missing authentication cookie
  const noCookieMe = await httpReq('/api/v1/auth/me');
  check(noCookieMe.status === 401, '10. Missing authentication cookie rejected with HTTP 401');

  // Test 11: Invalid JWT
  const invalidJwtMe = await httpReq('/api/v1/auth/me', {
    cookies: { [env.COOKIE_NAME]: 'invalid.jwt.token.value' }
  });
  check(invalidJwtMe.status === 401, '11. Invalid JWT rejected with HTTP 401');

  // Test 12: Expired JWT
  const expiredToken = jwt.sign(
    { tokenVersion: 0 },
    env.JWT_SECRET,
    { subject: studentUser._id.toString(), issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, expiresIn: '-1s' }
  );
  const expiredJwtMe = await httpReq('/api/v1/auth/me', {
    cookies: { [env.COOKIE_NAME]: expiredToken }
  });
  check(expiredJwtMe.status === 401, '12. Expired JWT rejected with HTTP 401');

  // Test 13: Deleted user with an old valid token
  const deletedUserToken = jwt.sign(
    { tokenVersion: 0 },
    env.JWT_SECRET,
    { subject: tempDeletedUser._id.toString(), issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, expiresIn: '1h' }
  );
  await User.deleteOne({ _id: tempDeletedUser._id });
  const deletedUserMe = await httpReq('/api/v1/auth/me', {
    cookies: { [env.COOKIE_NAME]: deletedUserToken }
  });
  check(deletedUserMe.status === 401, '13. Deleted user with old token rejected with HTTP 401');

  // Test 14: Changed role with an old token uses fresh DB role
  const roleChangeToken = jwt.sign(
    { tokenVersion: 0 },
    env.JWT_SECRET,
    { subject: tempRoleChangeUser._id.toString(), issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, expiresIn: '1h' }
  );
  await User.updateOne({ _id: tempRoleChangeUser._id }, { $set: { role: 'faculty' } });
  const roleChangeDashboard = await httpReq('/api/v1/dashboards/faculty', {
    cookies: { [env.COOKIE_NAME]: roleChangeToken }
  });
  const roleChangeMe = await httpReq('/api/v1/auth/me', {
    cookies: { [env.COOKIE_NAME]: roleChangeToken }
  });
  check(
    roleChangeMe.status === 200 && roleChangeMe.data?.data?.user?.role === 'faculty' && roleChangeDashboard.status === 200,
    '14. Changed DB role reflected immediately even with previously issued token'
  );

  // Test 21 & 22: RBAC role enforcement
  const studentHitsAdmin = await httpReq('/api/v1/dashboards/admin', {
    cookies: { [env.COOKIE_NAME]: studentAuthCookie }
  });
  check(studentHitsAdmin.status === 403, '21a. Student hitting admin endpoint rejected with HTTP 403', `got ${studentHitsAdmin.status}`);

  const facultyHitsAdmin = await httpReq('/api/v1/users', {
    cookies: { [env.COOKIE_NAME]: facultyAuthCookie }
  });
  check(facultyHitsAdmin.status === 403, '21b. Faculty hitting admin-only /users rejected with HTTP 403', `got ${facultyHitsAdmin.status}`);

  const adminHitsAdmin = await httpReq('/api/v1/users', {
    cookies: { [env.COOKIE_NAME]: adminAuthCookie }
  });
  check(adminHitsAdmin.status === 200 && Array.isArray(adminHitsAdmin.data?.data), '22a. Admin accessing /users succeeds with HTTP 200');

  const facultyHitsFaculty = await httpReq('/api/v1/dashboards/faculty', {
    cookies: { [env.COOKIE_NAME]: facultyAuthCookie }
  });
  check(facultyHitsFaculty.status === 200, '22b. Faculty accessing faculty dashboard succeeds with HTTP 200');

  const studentHitsStudent = await httpReq('/api/v1/dashboards/student', {
    cookies: { [env.COOKIE_NAME]: studentAuthCookie }
  });
  check(studentHitsStudent.status === 200, '22c. Student accessing student dashboard succeeds with HTTP 200');

  // Test 15 & 16: Logout + reuse of invalidated copied token
  const logoutRes = await httpReq('/api/v1/auth/logout', {
    method: 'POST',
    cookies: { [env.COOKIE_NAME]: studentAuthCookie, [env.CSRF_COOKIE_NAME]: activeCsrf },
    headers: { 'X-CSRF-Token': activeCsrf }
  });
  if (logoutRes.cookies[env.CSRF_COOKIE_NAME]) activeCsrf = logoutRes.cookies[env.CSRF_COOKIE_NAME];
  const clearedCookieHeader = logoutRes.rawSetCookie.find((h) => h.startsWith(`${env.COOKIE_NAME}=`)) || '';
  check(logoutRes.status === 200 && clearedCookieHeader.includes(`${env.COOKIE_NAME}=;`), '15. Logout clears HttpOnly cookie and returns HTTP 200');

  const reuseLoggedOutToken = await httpReq('/api/v1/auth/me', {
    cookies: { [env.COOKIE_NAME]: studentAuthCookie }
  });
  check(reuseLoggedOutToken.status === 401, '16. Reuse of invalidated session token after logout rejected with HTTP 401 (tokenVersion revocation)');

  // Test 20: Login rate limiting (9 login calls made so far; trigger attempts until 429)
  let rateLimited = false;
  for (let i = 0; i < env.LOGIN_RATE_LIMIT_MAX + 3; i++) {
    const res = await httpReq('/api/v1/auth/login', {
      method: 'POST',
      cookies: csrfCookies(),
      headers: authHeaders(),
      body: { email: studentUser.email, password: 'WrongPassword@1' }
    });
    if (res.status === 429) {
      rateLimited = true;
      break;
    }
  }
  check(rateLimited, '20. Login rate limiting enforces HTTP 429 Too Many Requests');

  // Bonus Integration Checks: Health endpoint & CORS
  const healthRes = await httpReq('/api/v1/health');
  check(healthRes.status === 200 && healthRes.data?.database?.isConnected === true, 'Integration: /api/v1/health confirms DB connected');

  const untrustedCors = await httpReq('/api/v1/health', {
    headers: { Origin: 'https://evil-attacker.example.com' }
  });
  check(untrustedCors.status === 403, 'Integration: Untrusted CORS origin rejected cleanly', `got ${untrustedCors.status}`);

  const trustedCors = await httpReq('/api/v1/health', {
    headers: { Origin: 'http://localhost:5173' }
  });
  check(
    trustedCors.status === 200 &&
      trustedCors.headers['access-control-allow-origin'] === 'http://localhost:5173' &&
      trustedCors.headers['access-control-allow-credentials'] === 'true',
    'Integration: Trusted CORS origin sets exact origin and Allow-Credentials: true'
  );
};

runTests()
  .catch((err) => {
    console.error('[Test Runner Fatal Error]', err);
    failed++;
  })
  .finally(async () => {
    try {
      await User.deleteMany({ email: { $regex: '^p4_.*@aktu\\.test$' } });
      console.log('\n[Cleanup] Removed temporary Phase 4 test users from MongoDB.');
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      await closeDatabase();
    } catch (cleanupErr) {
      console.error('[Cleanup Error]', cleanupErr.message);
    }

    console.log('\n' + '='.repeat(72));
    console.log(`PHASE 4 INTEGRATION TESTS -> TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('='.repeat(72) + '\n');
    process.exit(failed > 0 ? 1 : 0);
  });
