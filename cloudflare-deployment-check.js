#!/usr/bin/env node

/**
 * Cloudflare Workers Deployment Validation
 * Checks that worker-clean.js is correctly configured for Cloudflare deployment
 */

const fs = require('fs');

console.log('━'.repeat(80));
console.log('☁️  CLOUDFLARE WORKERS DEPLOYMENT VALIDATION');
console.log('━'.repeat(80));
console.log();

const validationResults = {
  timestamp: new Date().toISOString(),
  overall_status: 'PENDING',
  checks_passed: 0,
  checks_failed: 0,
  checks: []
};

// CHECK 1: Verify worker-clean.js exists
console.log('1️⃣  Checking worker-clean.js exists...');
try {
  if (fs.existsSync('./worker-clean.js')) {
    console.log('   ✅ PASS: worker-clean.js found\n');
    validationResults.checks.push({ check: 'Worker file exists', status: 'PASS' });
    validationResults.checks_passed++;
  } else {
    console.log('   ❌ FAIL: worker-clean.js not found\n');
    validationResults.checks.push({ check: 'Worker file exists', status: 'FAIL' });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'Worker file exists', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 2: Verify wrangler-clean.toml exists
console.log('2️⃣  Checking wrangler-clean.toml exists...');
try {
  if (fs.existsSync('./wrangler-clean.toml')) {
    console.log('   ✅ PASS: wrangler-clean.toml found\n');
    validationResults.checks.push({ check: 'Wrangler config exists', status: 'PASS' });
    validationResults.checks_passed++;
  } else {
    console.log('   ❌ FAIL: wrangler-clean.toml not found\n');
    validationResults.checks.push({ check: 'Wrangler config exists', status: 'FAIL' });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'Wrangler config exists', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 3: Verify worker-clean.js has correct export structure
console.log('3️⃣  Checking Cloudflare Workers export structure...');
try {
  const workerContent = fs.readFileSync('./worker-clean.js', 'utf-8');
  
  if (workerContent.includes('export default {') && workerContent.includes('async fetch(request, env, ctx)')) {
    console.log('   ✅ PASS: Correct Cloudflare Workers export structure\n');
    validationResults.checks.push({ check: 'Export structure', status: 'PASS' });
    validationResults.checks_passed++;
  } else {
    console.log('   ❌ FAIL: Missing or incorrect export structure\n');
    validationResults.checks.push({ check: 'Export structure', status: 'FAIL' });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'Export structure', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 4: Verify all 9 endpoints are defined
console.log('4️⃣  Checking all 9 endpoints are properly routed...');
try {
  const workerContent = fs.readFileSync('./worker-clean.js', 'utf-8');
  
  const requiredEndpoints = [
    "path === '/' && method === 'GET'",
    "path === '/health' && method === 'GET'",
    "path === '/analyze' && method === 'POST'",
    "path === '/api/bulk/analyze' && method === 'POST'",
    "path === '/api/security/scan' && method === 'POST'",
    "path === '/api/mobile-comparison' && method === 'POST'",
    "path === '/api/bot-test' && method === 'POST'",
    "path === '/api/export/csv' && method === 'POST'",
    "path === '/api/validate' && method === 'POST'"
  ];
  
  let allFound = true;
  const missing = [];
  
  requiredEndpoints.forEach(endpoint => {
    if (!workerContent.includes(endpoint)) {
      allFound = false;
      missing.push(endpoint);
    }
  });
  
  if (allFound) {
    console.log('   ✅ PASS: All 9 endpoints properly routed\n');
    validationResults.checks.push({ check: 'All endpoints routed', status: 'PASS', count: 9 });
    validationResults.checks_passed++;
  } else {
    console.log(`   ❌ FAIL: Missing endpoints: ${missing.join(', ')}\n`);
    validationResults.checks.push({ check: 'All endpoints routed', status: 'FAIL', missing });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'All endpoints routed', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 5: Verify all endpoint functions are implemented
console.log('5️⃣  Checking all endpoint functions are implemented...');
try {
  const workerContent = fs.readFileSync('./worker-clean.js', 'utf-8');
  
  const requiredFunctions = [
    'serveDocs()',
    'healthCheck',
    'analyzeURL',
    'bulkAnalyze',
    'securityScan',
    'mobileComparison',
    'botTest',
    'exportCSV',
    'validateURLs'
  ];
  
  let allFound = true;
  const missing = [];
  
  requiredFunctions.forEach(func => {
    if (!workerContent.includes(func)) {
      allFound = false;
      missing.push(func);
    }
  });
  
  if (allFound) {
    console.log('   ✅ PASS: All endpoint functions implemented\n');
    validationResults.checks.push({ check: 'All functions implemented', status: 'PASS', count: 9 });
    validationResults.checks_passed++;
  } else {
    console.log(`   ❌ FAIL: Missing functions: ${missing.join(', ')}\n`);
    validationResults.checks.push({ check: 'All functions implemented', status: 'FAIL', missing });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'All functions implemented', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 6: Verify CORS headers are properly configured
console.log('6️⃣  Checking CORS headers configuration...');
try {
  const workerContent = fs.readFileSync('./worker-clean.js', 'utf-8');
  
  if (workerContent.includes("'Access-Control-Allow-Origin': '*'") &&
      workerContent.includes("'Access-Control-Allow-Methods'") &&
      workerContent.includes("method === 'OPTIONS'")) {
    console.log('   ✅ PASS: CORS properly configured\n');
    validationResults.checks.push({ check: 'CORS configuration', status: 'PASS' });
    validationResults.checks_passed++;
  } else {
    console.log('   ❌ FAIL: CORS not properly configured\n');
    validationResults.checks.push({ check: 'CORS configuration', status: 'FAIL' });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'CORS configuration', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 7: Verify wrangler.toml has correct configuration
console.log('7️⃣  Checking wrangler.toml configuration...');
try {
  const wranglerContent = fs.readFileSync('./wrangler-clean.toml', 'utf-8');
  
  if (wranglerContent.includes('name =') &&
      wranglerContent.includes('main = "worker-clean.js"') &&
      wranglerContent.includes('compatibility_date')) {
    console.log('   ✅ PASS: wrangler.toml properly configured\n');
    validationResults.checks.push({ check: 'Wrangler config valid', status: 'PASS' });
    validationResults.checks_passed++;
  } else {
    console.log('   ❌ FAIL: wrangler.toml missing required fields\n');
    validationResults.checks.push({ check: 'Wrangler config valid', status: 'FAIL' });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'Wrangler config valid', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 8: Verify SSRF protection is implemented
console.log('8️⃣  Checking SSRF protection implementation...');
try {
  const workerContent = fs.readFileSync('./worker-clean.js', 'utf-8');
  
  if (workerContent.includes('validateURL') &&
      workerContent.includes('isPrivateIP') &&
      workerContent.includes('localhost')) {
    console.log('   ✅ PASS: SSRF protection implemented\n');
    validationResults.checks.push({ check: 'SSRF protection', status: 'PASS' });
    validationResults.checks_passed++;
  } else {
    console.log('   ⚠️  WARNING: SSRF protection may not be fully implemented\n');
    validationResults.checks.push({ check: 'SSRF protection', status: 'WARNING' });
    validationResults.checks_passed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'SSRF protection', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// CHECK 9: Verify worker file size is within limits
console.log('9️⃣  Checking worker file size...');
try {
  const stats = fs.statSync('./worker-clean.js');
  const fileSizeKB = stats.size / 1024;
  const maxSizeKB = 1024; // Cloudflare Workers limit is 1MB for free tier
  
  if (fileSizeKB < maxSizeKB) {
    console.log(`   ✅ PASS: Worker size is ${fileSizeKB.toFixed(2)} KB (under ${maxSizeKB} KB limit)\n`);
    validationResults.checks.push({ check: 'File size', status: 'PASS', size_kb: fileSizeKB.toFixed(2) });
    validationResults.checks_passed++;
  } else {
    console.log(`   ❌ FAIL: Worker size is ${fileSizeKB.toFixed(2)} KB (exceeds ${maxSizeKB} KB limit)\n`);
    validationResults.checks.push({ check: 'File size', status: 'FAIL', size_kb: fileSizeKB.toFixed(2) });
    validationResults.checks_failed++;
  }
} catch (error) {
  console.log(`   ❌ FAIL: ${error.message}\n`);
  validationResults.checks.push({ check: 'File size', status: 'FAIL', error: error.message });
  validationResults.checks_failed++;
}

// Final Summary
console.log('━'.repeat(80));
console.log('📊 VALIDATION SUMMARY');
console.log('━'.repeat(80));
console.log();
console.log(`✅ Checks Passed: ${validationResults.checks_passed}`);
console.log(`❌ Checks Failed: ${validationResults.checks_failed}`);
console.log();

if (validationResults.checks_failed === 0) {
  validationResults.overall_status = 'READY FOR DEPLOYMENT ✅';
  console.log('🎉 ' + validationResults.overall_status);
  console.log();
  console.log('Your Cloudflare Worker is correctly configured and ready to deploy!');
  console.log();
  console.log('📦 Deployment Command:');
  console.log('   wrangler deploy worker-clean.js --config wrangler-clean.toml');
  console.log();
  console.log('🌐 After deployment, your API will be available at:');
  console.log('   https://redirect-analyzer.<your-subdomain>.workers.dev');
  console.log();
} else {
  validationResults.overall_status = 'NOT READY ❌';
  console.log('⚠️  ' + validationResults.overall_status);
  console.log();
  console.log('Please fix the failed checks before deploying.');
  console.log();
}

// Save validation results
fs.writeFileSync('cloudflare-validation-report.json', JSON.stringify(validationResults, null, 2));
console.log('📄 Detailed report saved to: cloudflare-validation-report.json');
console.log();
console.log('━'.repeat(80));
