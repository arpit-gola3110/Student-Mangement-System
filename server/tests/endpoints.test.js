import http from 'http';
import app from '../app.js';

const server = http.createServer(app);

const request = (path, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (_) { parsed = body; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    req.end();
  });
};

server.listen(0, '127.0.0.1', async () => {
  try {
    console.log('[Test Suite] Verifying HTTP Endpoints...');

    // 1. /api/v1/health
    const r1 = await request('/api/v1/health');
    console.log(`[PASS] /api/v1/health -> HTTP ${r1.status}, status: ${r1.data.status}`);
    if (r1.status !== 200 || r1.data.status !== 'UP') throw new Error('Health check failed');

    // 2. /health root alias
    const r2 = await request('/health');
    console.log(`[PASS] /health root alias -> HTTP ${r2.status}`);
    if (r2.status !== 200) throw new Error('Root health alias failed');

    // 3. /api/nonexistent -> 404
    const r3 = await request('/api/nonexistent-endpoint');
    console.log(`[PASS] /api/nonexistent-endpoint -> HTTP ${r3.status}, message: ${r3.data.message}`);
    if (r3.status !== 404 || r3.data.success !== false) throw new Error('404 Not Found handling failed');

    // 4. /favicon.ico -> 204
    const r4 = await request('/favicon.ico');
    console.log(`[PASS] /favicon.ico -> HTTP ${r4.status}`);
    if (r4.status !== 204) throw new Error('Favicon handler failed');

    console.log('\n>>> ALL HTTP ENDPOINT INTEGRATION TESTS PASSED CLEANLY! <<<\n');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('[HTTP Test Error]', err);
    server.close(() => process.exit(1));
  }
});
