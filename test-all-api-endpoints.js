/**
 * Comprehensive API Endpoint Testing Script
 * Tests all 9 endpoints with real requests
 */

const http = require('http');
const https = require('https');

// Import worker code
const fs = require('fs');
const workerCode = fs.readFileSync('./worker-clean.js', 'utf-8');

// Create a Node.js compatible version of the worker
const { URL } = require('url');

// Evaluate worker code in a way that makes it available
let workerModule;
try {
  // Create a module wrapper
  const moduleWrapper = `
    ${workerCode.replace('export default', 'module.exports =')}
  `;
  
  // Write to temp file and require it
  fs.writeFileSync('/tmp/worker-temp.js', moduleWrapper);
  workerModule = require('/tmp/worker-temp.js');
} catch (error) {
  console.error('Error loading worker:', error.message);
  process.exit(1);
}

// Create server
const PORT = 5000;
const server = http.createServer(async (req, res) => {
  try {
    // Collect request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      // Create a Request-like object for the worker
      const url = `http://localhost:${PORT}${req.url}`;
      const mockRequest = {
        url: url,
        method: req.method,
        headers: new Map(Object.entries(req.headers)),
        json: async () => body ? JSON.parse(body) : {},
        text: async () => body
      };
      
      // Call the worker
      try {
        const response = await workerModule.fetch(mockRequest, {}, {});
        
        // Extract response data
        const responseText = await response.text();
        const headers = {};
        
        // Copy headers from response
        if (response.headers) {
          if (response.headers.forEach) {
            response.headers.forEach((value, key) => {
              headers[key] = value;
            });
          } else if (typeof response.headers === 'object') {
            Object.assign(headers, response.headers);
          }
        }
        
        // Send response
        res.writeHead(response.status || 200, headers);
        res.end(responseText);
      } catch (workerError) {
        console.error('Worker error:', workerError);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error', 
          message: workerError.message 
        }));
      }
    });
  } catch (error) {
    console.error('Request error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server error', message: error.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 API Test Server running on http://localhost:${PORT}\n`);
  
  // Start testing after a brief delay
  setTimeout(() => {
    runAllTests();
  }, 1000);
});

// Testing functions
async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body,
            json: res.headers['content-type']?.includes('application/json') ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({ status: res.statusCode, body: body, json: null });
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

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║       TESTING ALL 9 API ENDPOINTS                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  // Test 1: GET / (Welcome Page)
  console.log('📋 Test 1: GET / (Welcome Page)');
  try {
    const res = await makeRequest('GET', '/');
    if (res.status === 200 && res.body.includes('Redirect Chain Analyzer')) {
      console.log('✅ PASSED - Returns HTML welcome page\n');
      results.passed++;
      results.tests.push({ endpoint: 'GET /', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Unexpected response\n');
      results.failed++;
      results.tests.push({ endpoint: 'GET /', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'GET /', status: 'FAIL', error: error.message });
  }
  
  // Test 2: GET /health (Health Check)
  console.log('📋 Test 2: GET /health (Health Check)');
  try {
    const res = await makeRequest('GET', '/health');
    if (res.status === 200 && res.json && res.json.status === 'healthy') {
      console.log('✅ PASSED - Health check working');
      console.log(`   Version: ${res.json.version}, Platform: ${res.json.platform}\n`);
      results.passed++;
      results.tests.push({ endpoint: 'GET /health', status: 'PASS', data: res.json });
    } else {
      console.log('❌ FAILED - Invalid health response\n');
      results.failed++;
      results.tests.push({ endpoint: 'GET /health', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'GET /health', status: 'FAIL', error: error.message });
  }
  
  // Test 3: POST /analyze (Main Analysis)
  console.log('📋 Test 3: POST /analyze (Main Redirect Analysis)');
  try {
    const res = await makeRequest('POST', '/analyze', {
      url: 'http://google.com'
    });
    if (res.status === 200 && res.json) {
      const data = res.json;
      console.log('✅ PASSED - Redirect analysis working');
      console.log(`   Input URL: ${data.input_url}`);
      console.log(`   Final URL: ${data.final_url}`);
      console.log(`   Total Redirects: ${data.total_redirects}`);
      console.log(`   Safety Score: ${data.safety_score}/100`);
      console.log(`   Is Affiliate: ${data.is_affiliate_url}`);
      console.log(`   Is Tracking: ${data.is_tracking_url}\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /analyze', status: 'PASS', sample: data });
    } else {
      console.log('❌ FAILED - Invalid response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /analyze', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /analyze', status: 'FAIL', error: error.message });
  }
  
  // Test 4: POST /api/bulk/analyze (Bulk Analysis)
  console.log('📋 Test 4: POST /api/bulk/analyze (Bulk URL Analysis)');
  try {
    const res = await makeRequest('POST', '/api/bulk/analyze', {
      urls: ['http://google.com', 'http://github.com']
    });
    if (res.status === 200 && res.json && res.json.results) {
      console.log('✅ PASSED - Bulk analysis working');
      console.log(`   Total URLs analyzed: ${res.json.total_urls}`);
      console.log(`   Results count: ${res.json.results.length}\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/bulk/analyze', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Invalid response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /api/bulk/analyze', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /api/bulk/analyze', status: 'FAIL', error: error.message });
  }
  
  // Test 5: POST /api/security/scan (Security Scan)
  console.log('📋 Test 5: POST /api/security/scan (Security Analysis)');
  try {
    const res = await makeRequest('POST', '/api/security/scan', {
      url: 'https://example.com'
    });
    if (res.status === 200 && res.json) {
      console.log('✅ PASSED - Security scan working');
      console.log(`   HTTPS Only: ${res.json.https_only}`);
      console.log(`   Safety Score: ${res.json.safety_score}/100`);
      console.log(`   Security Score: ${res.json.security_score}/100\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/security/scan', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Invalid response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /api/security/scan', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /api/security/scan', status: 'FAIL', error: error.message });
  }
  
  // Test 6: POST /api/mobile-comparison (Mobile vs Desktop)
  console.log('📋 Test 6: POST /api/mobile-comparison (Mobile vs Desktop)');
  try {
    const res = await makeRequest('POST', '/api/mobile-comparison', {
      url: 'http://google.com'
    });
    if (res.status === 200 && res.json) {
      console.log('✅ PASSED - Mobile comparison working');
      console.log(`   Desktop chain length: ${res.json.desktop?.chain?.length || 0}`);
      console.log(`   Mobile chain length: ${res.json.mobile?.chain?.length || 0}`);
      console.log(`   Different behavior: ${res.json.different_behavior}\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/mobile-comparison', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Invalid response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /api/mobile-comparison', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /api/mobile-comparison', status: 'FAIL', error: error.message });
  }
  
  // Test 7: POST /api/bot-test (Bot User Agent Testing)
  console.log('📋 Test 7: POST /api/bot-test (Bot User Agent Testing)');
  try {
    const res = await makeRequest('POST', '/api/bot-test', {
      url: 'http://google.com',
      bot_types: ['googlebot', 'bingbot']
    });
    if (res.status === 200 && res.json) {
      console.log('✅ PASSED - Bot testing working');
      console.log(`   Bots tested: ${Object.keys(res.json.bot_results || {}).length}`);
      console.log(`   Cloaking detected: ${res.json.cloaking_detected}\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/bot-test', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Invalid response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /api/bot-test', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /api/bot-test', status: 'FAIL', error: error.message });
  }
  
  // Test 8: POST /api/export/csv (CSV Export)
  console.log('📋 Test 8: POST /api/export/csv (CSV Export)');
  try {
    const res = await makeRequest('POST', '/api/export/csv', {
      url: 'http://google.com'
    });
    if (res.status === 200 && res.body.includes('Step,URL,Status')) {
      console.log('✅ PASSED - CSV export working');
      console.log(`   CSV data returned (${res.body.length} bytes)\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/export/csv', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Invalid CSV response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /api/export/csv', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /api/export/csv', status: 'FAIL', error: error.message });
  }
  
  // Test 9: POST /api/validate (URL Validation)
  console.log('📋 Test 9: POST /api/validate (URL Validation)');
  try {
    const res = await makeRequest('POST', '/api/validate', {
      urls: ['http://google.com', 'http://invalid-url-xyz123.com']
    });
    if (res.status === 200 && res.json && res.json.results) {
      console.log('✅ PASSED - URL validation working');
      console.log(`   URLs validated: ${res.json.results.length}\n`);
      results.passed++;
      results.tests.push({ endpoint: 'POST /api/validate', status: 'PASS' });
    } else {
      console.log('❌ FAILED - Invalid response\n');
      results.failed++;
      results.tests.push({ endpoint: 'POST /api/validate', status: 'FAIL' });
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}\n`);
    results.failed++;
    results.tests.push({ endpoint: 'POST /api/validate', status: 'FAIL', error: error.message });
  }
  
  // Final Summary
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL RESULTS                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%\n`);
  
  // Write results to file
  fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  console.log('📝 Detailed results saved to: test-results.json\n');
  
  // Exit
  process.exit(results.failed === 0 ? 0 : 1);
}
