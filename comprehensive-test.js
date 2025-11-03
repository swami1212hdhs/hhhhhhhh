/**
 * Comprehensive API Endpoint Tester
 * Tests all 9 endpoints with proper inputs
 */

const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_URL = 'https://google.com';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: res.headers['content-type']?.includes('json') ? JSON.parse(body) : body
          };
          resolve(response);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test cases for all 9 endpoints
const tests = [
  {
    name: 'Endpoint 1: GET /',
    method: 'GET',
    path: '/',
    data: null,
    validate: (res) => res.status === 200 && res.headers['content-type']?.includes('html')
  },
  {
    name: 'Endpoint 2: GET /health',
    method: 'GET',
    path: '/health',
    data: null,
    validate: (res) => res.status === 200 && res.body.status === 'healthy'
  },
  {
    name: 'Endpoint 3: POST /analyze',
    method: 'POST',
    path: '/analyze',
    data: { url: TEST_URL },
    validate: (res) => {
      if (res.status !== 200) return false;
      const body = res.body;
      return body.input_url && body.final_url && Array.isArray(body.redirect_chain);
    }
  },
  {
    name: 'Endpoint 4: POST /api/bulk/analyze',
    method: 'POST',
    path: '/api/bulk/analyze',
    data: { urls: [TEST_URL, 'https://github.com'] },
    validate: (res) => {
      if (res.status !== 200) return false;
      const body = res.body;
      return body.total_urls === 2 && Array.isArray(body.results);
    }
  },
  {
    name: 'Endpoint 5: POST /api/security/scan',
    method: 'POST',
    path: '/api/security/scan',
    data: { url: TEST_URL },
    validate: (res) => {
      if (res.status !== 200) return false;
      const body = res.body;
      return body.url && body.security_analysis;
    }
  },
  {
    name: 'Endpoint 6: POST /api/mobile-comparison',
    method: 'POST',
    path: '/api/mobile-comparison',
    data: { url: TEST_URL },
    validate: (res) => {
      if (res.status !== 200) return false;
      const body = res.body;
      return body.desktop && body.mobile && typeof body.different_behavior === 'boolean';
    }
  },
  {
    name: 'Endpoint 7: POST /api/bot-test',
    method: 'POST',
    path: '/api/bot-test',
    data: { url: TEST_URL, bot_types: ['googlebot', 'bingbot'] },
    validate: (res) => {
      if (res.status !== 200) return false;
      const body = res.body;
      return body.bot_results && body.normal_user_result;
    }
  },
  {
    name: 'Endpoint 8: POST /api/export/csv',
    method: 'POST',
    path: '/api/export/csv',
    data: { url: TEST_URL },
    validate: (res) => {
      return res.status === 200 && res.headers['content-type']?.includes('csv');
    }
  },
  {
    name: 'Endpoint 9: POST /api/validate',
    method: 'POST',
    path: '/api/validate',
    data: { urls: [TEST_URL, 'https://example.com'] },
    validate: (res) => {
      if (res.status !== 200) return false;
      const body = res.body;
      return Array.isArray(body.results) && body.results.length === 2;
    }
  }
];

// Run all tests
async function runTests() {
  console.log(colors.cyan + '\n╔═══════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║  Testing All 9 API Endpoints                              ║' + colors.reset);
  console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════╝\n' + colors.reset);

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  for (const test of tests) {
    try {
      console.log(colors.blue + `\nTesting: ${test.name}` + colors.reset);
      console.log(`  Method: ${test.method} ${test.path}`);
      
      if (test.data) {
        console.log(`  Data: ${JSON.stringify(test.data)}`);
      }

      const response = await makeRequest(test.method, test.path, test.data);
      
      console.log(`  Status: ${response.status}`);
      
      if (test.validate(response)) {
        console.log(colors.green + '  ✓ PASSED' + colors.reset);
        results.passed++;
        
        // Show sample response for successful tests
        if (typeof response.body === 'object') {
          console.log(`  Response keys: ${Object.keys(response.body).join(', ')}`);
        }
      } else {
        console.log(colors.red + '  ✗ FAILED - Validation failed' + colors.reset);
        console.log(`  Response: ${JSON.stringify(response.body).substring(0, 200)}`);
        results.failed++;
        results.errors.push({
          test: test.name,
          status: response.status,
          response: response.body
        });
      }
    } catch (error) {
      console.log(colors.red + `  ✗ ERROR: ${error.message}` + colors.reset);
      results.failed++;
      results.errors.push({
        test: test.name,
        error: error.message
      });
    }
  }

  // Summary
  console.log(colors.cyan + '\n╔═══════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║  TEST SUMMARY                                             ║' + colors.reset);
  console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════╝\n' + colors.reset);
  
  console.log(`Total Tests: ${tests.length}`);
  console.log(colors.green + `Passed: ${results.passed}` + colors.reset);
  console.log(colors.red + `Failed: ${results.failed}` + colors.reset);
  
  if (results.failed > 0) {
    console.log(colors.yellow + '\nFailed Tests Details:' + colors.reset);
    results.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.test}`);
      if (err.error) {
        console.log(`   Error: ${err.error}`);
      } else {
        console.log(`   Status: ${err.status}`);
        console.log(`   Response: ${JSON.stringify(err.response).substring(0, 150)}...`);
      }
    });
  }
  
  console.log('\n' + colors.cyan + '═══════════════════════════════════════════════════════════\n' + colors.reset);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);
