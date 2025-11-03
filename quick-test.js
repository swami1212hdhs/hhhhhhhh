/**
 * Quick Direct Test - Tests all 9 endpoints without relying on external server
 */

const http = require('http');

// Start the full API server
const server = require('./full-api-server.js');

// Wait for server to be ready, then test
setTimeout(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Testing All 9 API Endpoints                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const tests = [
    {
      name: '1. GET /',
      method: 'GET',
      path: '/',
      data: null
    },
    {
      name: '2. GET /health',
      method: 'GET',
      path: '/health',
      data: null
    },
    {
      name: '3. POST /analyze',
      method: 'POST',
      path: '/analyze',
      data: { url: 'https://google.com' }
    },
    {
      name: '4. POST /api/bulk/analyze',
      method: 'POST',
      path: '/api/bulk/analyze',
      data: { urls: ['https://google.com', 'https://github.com'] }
    },
    {
      name: '5. POST /api/security/scan',
      method: 'POST',
      path: '/api/security/scan',
      data: { url: 'https://google.com' }
    },
    {
      name: '6. POST /api/mobile-comparison',
      method: 'POST',
      path: '/api/mobile-comparison',
      data: { url: 'https://google.com' }
    },
    {
      name: '7. POST /api/bot-test',
      method: 'POST',
      path: '/api/bot-test',
      data: { url: 'https://google.com', bot_types: ['googlebot', 'bingbot'] }
    },
    {
      name: '8. POST /api/export/csv',
      method: 'POST',
      path: '/api/export/csv',
      data: { url: 'https://google.com' }
    },
    {
      name: '9. POST /api/validate',
      method: 'POST',
      path: '/api/validate',
      data: { urls: ['https://google.com', 'https://example.com'] }
    }
  ];

  function makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const response = await makeRequest(test.method, test.path, test.data);
      
      if (response.status === 200) {
        console.log(`  ✓ PASSED (Status: ${response.status})`);
        passed++;
      } else {
        console.log(`  ✗ FAILED (Status: ${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nTotal: 9 | Passed: ${passed} | Failed: ${failed}\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}, 3000);
