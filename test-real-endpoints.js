// Test with real HTTP requests and actual URLs
const http = require('http');

const PORT = 5000;
const TEST_URL = 'https://google.com';

function makeRequest(method, path, data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = res.headers['content-type']?.includes('json') ? JSON.parse(body) : body;
          resolve({
            success: true,
            status: res.statusCode,
            contentType: res.headers['content-type'],
            body: parsedBody
          });
        } catch (e) {
          resolve({
            success: true,
            status: res.statusCode,
            contentType: res.headers['content-type'],
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Testing All 9 Endpoints with REAL HTTP Requests         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const tests = [
    {
      name: '1. GET /',
      method: 'GET',
      path: '/',
      validate: (r) => r.success && r.status === 200 && r.contentType?.includes('html')
    },
    {
      name: '2. GET /health',
      method: 'GET',
      path: '/health',
      validate: (r) => r.success && r.status === 200 && r.body?.status === 'healthy'
    },
    {
      name: '3. POST /analyze',
      method: 'POST',
      path: '/analyze',
      data: { url: TEST_URL },
      validate: (r) => r.success && r.status === 200 && r.body?.input_url && r.body?.redirect_chain
    },
    {
      name: '4. POST /api/bulk/analyze',
      method: 'POST',
      path: '/api/bulk/analyze',
      data: { urls: [TEST_URL, 'https://github.com'] },
      validate: (r) => r.success && r.status === 200 && r.body?.total_urls === 2 && Array.isArray(r.body?.results)
    },
    {
      name: '5. POST /api/security/scan',
      method: 'POST',
      path: '/api/security/scan',
      data: { url: TEST_URL },
      validate: (r) => r.success && r.status === 200 && r.body?.security_analysis
    },
    {
      name: '6. POST /api/mobile-comparison',
      method: 'POST',
      path: '/api/mobile-comparison',
      data: { url: TEST_URL },
      validate: (r) => r.success && r.status === 200 && r.body?.desktop && r.body?.mobile
    },
    {
      name: '7. POST /api/bot-test',
      method: 'POST',
      path: '/api/bot-test',
      data: { url: TEST_URL, bot_types: ['googlebot', 'bingbot'] },
      validate: (r) => r.success && r.status === 200 && r.body?.bot_results && r.body?.normal_user_result
    },
    {
      name: '8. POST /api/export/csv',
      method: 'POST',
      path: '/api/export/csv',
      data: { url: TEST_URL },
      validate: (r) => r.success && r.status === 200 && r.contentType?.includes('csv')
    },
    {
      name: '9. POST /api/validate',
      method: 'POST',
      path: '/api/validate',
      data: { urls: [TEST_URL, 'https://example.com'] },
      validate: (r) => r.success && r.status === 200 && Array.isArray(r.body?.results)
    }
  ];
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    if (test.data) {
      console.log(`  Input: ${JSON.stringify(test.data).substring(0, 80)}...`);
    }
    
    const result = await makeRequest(test.method, test.path, test.data);
    
    if (test.validate(result)) {
      console.log(`  ✓ PASSED - Status: ${result.status}`);
      
      // Show some response details for successful tests
      if (typeof result.body === 'object' && result.body !== null) {
        const keys = Object.keys(result.body);
        console.log(`  Response keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      }
      
      passed++;
      results.push({
        endpoint: test.name,
        status: 'PASS',
        http_status: result.status
      });
    } else {
      console.log(`  ✗ FAILED`);
      if (!result.success) {
        console.log(`  Error: ${result.error}`);
      } else {
        console.log(`  Status: ${result.status}`);
        if (typeof result.body === 'object') {
          console.log(`  Response: ${JSON.stringify(result.body).substring(0, 100)}...`);
        }
      }
      failed++;
      results.push({
        endpoint: test.name,
        status: 'FAIL',
        error: result.error || `Status ${result.status}`,
        response: typeof result.body === 'string' ? result.body.substring(0, 100) : JSON.stringify(result.body).substring(0, 100)
      });
    }
    
    console.log('');
  }
  
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FINAL TEST RESULTS                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`Total Endpoints: 9`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed/9)*100)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 ALL ENDPOINTS WORKING CORRECTLY WITH REAL DATA!\n');
  } else {
    console.log('⚠️  Some endpoints need attention:\n');
    results.filter(r => r.status === 'FAIL').forEach((r, i) => {
      console.log(`${i + 1}. ${r.endpoint}`);
      console.log(`   ${r.error}`);
      if (r.response) console.log(`   Response: ${r.response}`);
    });
    console.log('');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Wait for server to be ready
setTimeout(runTests, 3000);
