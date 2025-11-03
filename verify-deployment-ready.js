#!/usr/bin/env node

/**
 * Verification Script - Checks if deployment is ready
 */

const fs = require('fs');

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  Cloudflare Deployment Verification                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const checks = [];

// Check 1: wrangler.toml exists
const wranglerExists = fs.existsSync('wrangler.toml');
checks.push({
  name: 'wrangler.toml configuration file',
  status: wranglerExists,
  required: true
});

// Check 2: worker-clean.js exists
const workerExists = fs.existsSync('worker-clean.js');
checks.push({
  name: 'worker-clean.js entry point',
  status: workerExists,
  required: true
});

// Check 3: Check wrangler.toml has correct entry point
let correctEntry = false;
if (wranglerExists) {
  const wranglerContent = fs.readFileSync('wrangler.toml', 'utf8');
  correctEntry = wranglerContent.includes('main = "worker-clean.js"');
}
checks.push({
  name: 'Entry point configured correctly',
  status: correctEntry,
  required: true
});

// Check 4: Worker has export default
let hasExport = false;
if (workerExists) {
  const workerContent = fs.readFileSync('worker-clean.js', 'utf8');
  hasExport = workerContent.includes('export default');
}
checks.push({
  name: 'Worker has proper export statement',
  status: hasExport,
  required: true
});

// Check 5: Worker implements all 9 endpoints
let endpointCount = 0;
if (workerExists) {
  const workerContent = fs.readFileSync('worker-clean.js', 'utf8');
  const endpoints = [
    'path === \'/\'',
    'path === \'/health\'',
    'path === \'/analyze\'',
    'path === \'/api/bulk/analyze\'',
    'path === \'/api/security/scan\'',
    'path === \'/api/mobile-comparison\'',
    'path === \'/api/bot-test\'',
    'path === \'/api/export/csv\'',
    'path === \'/api/validate\''
  ];
  endpointCount = endpoints.filter(ep => workerContent.includes(ep)).length;
}
checks.push({
  name: `All 9 endpoints implemented (found ${endpointCount})`,
  status: endpointCount === 9,
  required: true
});

// Check 6: package.json exists
const packageExists = fs.existsSync('package.json');
checks.push({
  name: 'package.json exists',
  status: packageExists,
  required: false
});

// Display results
console.log('Checking deployment requirements:\n');
let allPassed = true;

checks.forEach((check, index) => {
  const icon = check.status ? '✅' : '❌';
  const label = check.required ? '(REQUIRED)' : '(OPTIONAL)';
  console.log(`${icon} ${index + 1}. ${check.name} ${label}`);
  if (check.required && !check.status) {
    allPassed = false;
  }
});

console.log('\n' + '─'.repeat(63) + '\n');

if (allPassed) {
  console.log('✅ ALL CHECKS PASSED - READY TO DEPLOY!\n');
  console.log('Deploy now with:');
  console.log('  npx wrangler deploy\n');
  console.log('Or:');
  console.log('  npx wrangler login    # Login first if needed');
  console.log('  npx wrangler deploy   # Then deploy\n');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED - FIX ISSUES ABOVE\n');
  process.exit(1);
}
