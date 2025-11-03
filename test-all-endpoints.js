#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Tester
 * Tests all 9 endpoints and returns results in JavaScript format
 */

const http = require('http');

// Start the server
const server = require('./server.js');

// Wait for server to be ready
setTimeout(async () => {
  console.log('🧪 Testing All API Endpoints\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    total_endpoints: 9,
    tested: 0,
    passed: 0,
    failed: 0,
    endpoints: []
  };

  // Helper function to make HTTP requests
  function makeRequest(method, path, body = null) {
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
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  // Test 1: GET /
  try {
    console.log('1️⃣  Testing GET /');
    const response = await makeRequest('GET', '/');
    const success = response.statusCode === 200 && response.body.includes('Redirect Chain Analyzer');
    results.endpoints.push({
      endpoint: 'GET /',
      name: 'Welcome Page',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: 'N/A'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode}\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'GET /',
      name: 'Welcome Page',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 2: GET /health
  try {
    console.log('2️⃣  Testing GET /health');
    const start = Date.now();
    const response = await makeRequest('GET', '/health');
    const time = Date.now() - start;
    const body = JSON.parse(response.body);
    const success = response.statusCode === 200 && body.status === 'healthy';
    results.endpoints.push({
      endpoint: 'GET /health',
      name: 'Health Check',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      data: body
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'GET /health',
      name: 'Health Check',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 3: POST /analyze
  try {
    console.log('3️⃣  Testing POST /analyze');
    const start = Date.now();
    const response = await makeRequest('POST', '/analyze', { url: 'http://google.com' });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    let body = 'Not available in dev server';
    try {
      body = JSON.parse(response.body);
    } catch {}
    results.endpoints.push({
      endpoint: 'POST /analyze',
      name: 'Main Redirect Analysis',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /analyze',
      name: 'Main Redirect Analysis',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 4: POST /api/bulk/analyze
  try {
    console.log('4️⃣  Testing POST /api/bulk/analyze');
    const start = Date.now();
    const response = await makeRequest('POST', '/api/bulk/analyze', { 
      urls: ['http://google.com', 'http://example.com'] 
    });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    results.endpoints.push({
      endpoint: 'POST /api/bulk/analyze',
      name: 'Bulk URL Analysis',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /api/bulk/analyze',
      name: 'Bulk URL Analysis',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 5: POST /api/security/scan
  try {
    console.log('5️⃣  Testing POST /api/security/scan');
    const start = Date.now();
    const response = await makeRequest('POST', '/api/security/scan', { url: 'http://google.com' });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    results.endpoints.push({
      endpoint: 'POST /api/security/scan',
      name: 'Security Scanning',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /api/security/scan',
      name: 'Security Scanning',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 6: POST /api/mobile-comparison
  try {
    console.log('6️⃣  Testing POST /api/mobile-comparison');
    const start = Date.now();
    const response = await makeRequest('POST', '/api/mobile-comparison', { url: 'http://google.com' });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    results.endpoints.push({
      endpoint: 'POST /api/mobile-comparison',
      name: 'Mobile vs Desktop Comparison',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /api/mobile-comparison',
      name: 'Mobile vs Desktop Comparison',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 7: POST /api/bot-test
  try {
    console.log('7️⃣  Testing POST /api/bot-test');
    const start = Date.now();
    const response = await makeRequest('POST', '/api/bot-test', { 
      url: 'http://google.com',
      bot_types: ['googlebot', 'bingbot']
    });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    results.endpoints.push({
      endpoint: 'POST /api/bot-test',
      name: 'Bot User Agent Testing',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /api/bot-test',
      name: 'Bot User Agent Testing',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 8: POST /api/export/csv
  try {
    console.log('8️⃣  Testing POST /api/export/csv');
    const start = Date.now();
    const response = await makeRequest('POST', '/api/export/csv', { url: 'http://google.com' });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    results.endpoints.push({
      endpoint: 'POST /api/export/csv',
      name: 'Export to CSV',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /api/export/csv',
      name: 'Export to CSV',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 9: POST /api/validate
  try {
    console.log('9️⃣  Testing POST /api/validate');
    const start = Date.now();
    const response = await makeRequest('POST', '/api/validate', { 
      urls: ['http://google.com', 'http://example.com'] 
    });
    const time = Date.now() - start;
    const success = response.statusCode === 200;
    results.endpoints.push({
      endpoint: 'POST /api/validate',
      name: 'URL Validation',
      status: success ? 'PASS' : 'FAIL',
      statusCode: response.statusCode,
      responseTime: `${time}ms`,
      note: 'Requires Cloudflare Workers deployment'
    });
    if (success) results.passed++; else results.failed++;
    results.tested++;
    console.log(`   ✅ Status: ${response.statusCode} (${time}ms)\n`);
  } catch (error) {
    results.endpoints.push({
      endpoint: 'POST /api/validate',
      name: 'URL Validation',
      status: 'FAIL',
      error: error.message
    });
    results.failed++;
    results.tested++;
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Endpoints: ${results.total_endpoints}`);
  console.log(`Tested: ${results.tested}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('='.repeat(60));
  
  // Save results as JSON
  const fs = require('fs');
  fs.writeFileSync('endpoint-test-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Full results saved to: endpoint-test-results.json');
  
  // Print JavaScript format
  console.log('\n📦 JavaScript Format:');
  console.log('const endpointResults = ' + JSON.stringify(results, null, 2) + ';');
  
  process.exit(0);
}, 2000);
