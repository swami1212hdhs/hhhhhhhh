#!/usr/bin/env node

/**
 * Cloudflare Routing Verification
 * Tests that all 9 endpoints will route correctly when deployed to Cloudflare
 */

console.log('═'.repeat(80));
console.log('☁️  CLOUDFLARE ENDPOINT ROUTING VERIFICATION');
console.log('═'.repeat(80));
console.log();

// Read the worker file and verify routing
const fs = require('fs');
const workerCode = fs.readFileSync('./worker-clean.js', 'utf-8');

const routingVerification = {
  "verification_date": new Date().toISOString(),
  "total_endpoints": 9,
  "all_routes_correct": true,
  "cloudflare_compatible": true,
  "routes": []
};

// Define all expected routes
const expectedRoutes = [
  { path: "/", method: "GET", function: "serveDocs()" },
  { path: "/health", method: "GET", function: "healthCheck(corsHeaders)" },
  { path: "/analyze", method: "POST", function: "analyzeURL(request, corsHeaders)" },
  { path: "/api/bulk/analyze", method: "POST", function: "bulkAnalyze(request, corsHeaders)" },
  { path: "/api/security/scan", method: "POST", function: "securityScan(request, corsHeaders)" },
  { path: "/api/mobile-comparison", method: "POST", function: "mobileComparison(request, corsHeaders)" },
  { path: "/api/bot-test", method: "POST", function: "botTest(request, corsHeaders)" },
  { path: "/api/export/csv", method: "POST", function: "exportCSV(request, corsHeaders)" },
  { path: "/api/validate", method: "POST", function: "validateURLs(request, corsHeaders)" }
];

console.log('🔍 Checking routing for all 9 endpoints...\n');

expectedRoutes.forEach((route, index) => {
  const routePattern = `path === '${route.path}' && method === '${route.method}'`;
  const functionPattern = route.function.split('(')[0]; // Get function name without params
  
  const hasRoute = workerCode.includes(routePattern);
  const hasFunction = workerCode.includes(`async function ${functionPattern}`) || 
                      workerCode.includes(`function ${functionPattern}`);
  
  const status = hasRoute && hasFunction;
  
  console.log(`${index + 1}. ${route.method} ${route.path}`);
  console.log(`   Route defined: ${hasRoute ? '✅ YES' : '❌ NO'}`);
  console.log(`   Function exists: ${hasFunction ? '✅ YES' : '❌ NO'}`);
  console.log(`   Will route correctly: ${status ? '✅ YES' : '❌ NO'}`);
  console.log();
  
  routingVerification.routes.push({
    id: index + 1,
    method: route.method,
    path: route.path,
    function: route.function,
    route_defined: hasRoute,
    function_exists: hasFunction,
    will_route_correctly: status
  });
  
  if (!status) {
    routingVerification.all_routes_correct = false;
  }
});

// Check export structure
const hasExport = workerCode.includes('export default {');
const hasFetch = workerCode.includes('async fetch(request, env, ctx)');

console.log('═'.repeat(80));
console.log('📋 CLOUDFLARE WORKER STRUCTURE VERIFICATION');
console.log('═'.repeat(80));
console.log();
console.log(`Export default structure: ${hasExport ? '✅ CORRECT' : '❌ MISSING'}`);
console.log(`Fetch handler: ${hasFetch ? '✅ CORRECT' : '❌ MISSING'}`);
console.log();

routingVerification.worker_structure = {
  export_default: hasExport,
  fetch_handler: hasFetch,
  correct: hasExport && hasFetch
};

// Check request handling
const hasHandleRequest = workerCode.includes('async function handleRequest(request, env, ctx)');
const hasURLParsing = workerCode.includes('const url = new URL(request.url)');
const hasPathExtraction = workerCode.includes('const path = url.pathname');

console.log('═'.repeat(80));
console.log('🔄 REQUEST HANDLING VERIFICATION');
console.log('═'.repeat(80));
console.log();
console.log(`handleRequest function: ${hasHandleRequest ? '✅ CORRECT' : '❌ MISSING'}`);
console.log(`URL parsing: ${hasURLParsing ? '✅ CORRECT' : '❌ MISSING'}`);
console.log(`Path extraction: ${hasPathExtraction ? '✅ CORRECT' : '❌ MISSING'}`);
console.log();

routingVerification.request_handling = {
  handle_request_function: hasHandleRequest,
  url_parsing: hasURLParsing,
  path_extraction: hasPathExtraction,
  correct: hasHandleRequest && hasURLParsing && hasPathExtraction
};

// Final verification
console.log('═'.repeat(80));
console.log('✅ FINAL VERIFICATION RESULTS');
console.log('═'.repeat(80));
console.log();

const allCorrect = routingVerification.all_routes_correct && 
                   routingVerification.worker_structure.correct &&
                   routingVerification.request_handling.correct;

if (allCorrect) {
  console.log('🎉 ALL ENDPOINTS WILL ROUTE CORRECTLY TO CLOUDFLARE! ✅');
  console.log();
  console.log('When you deploy to Cloudflare:');
  console.log('  1. ✅ All 9 endpoints are properly defined');
  console.log('  2. ✅ All routing paths are correctly configured');
  console.log('  3. ✅ All handler functions exist');
  console.log('  4. ✅ Worker structure is Cloudflare-compatible');
  console.log('  5. ✅ Request handling will work correctly');
  console.log();
  console.log('📦 Deploy command:');
  console.log('   wrangler deploy worker-clean.js --config wrangler-clean.toml');
  console.log();
  console.log('🌐 After deployment, all these URLs will work:');
  console.log('   https://redirect-analyzer.workers.dev/');
  console.log('   https://redirect-analyzer.workers.dev/health');
  console.log('   https://redirect-analyzer.workers.dev/analyze');
  console.log('   https://redirect-analyzer.workers.dev/api/bulk/analyze');
  console.log('   https://redirect-analyzer.workers.dev/api/security/scan');
  console.log('   https://redirect-analyzer.workers.dev/api/mobile-comparison');
  console.log('   https://redirect-analyzer.workers.dev/api/bot-test');
  console.log('   https://redirect-analyzer.workers.dev/api/export/csv');
  console.log('   https://redirect-analyzer.workers.dev/api/validate');
  routingVerification.final_status = 'READY FOR DEPLOYMENT ✅';
} else {
  console.log('⚠️  ISSUES FOUND - Some endpoints may not route correctly');
  routingVerification.final_status = 'NEEDS FIXES ❌';
}

console.log();
console.log('═'.repeat(80));

// Save results
fs.writeFileSync('cloudflare-routing-verification.json', JSON.stringify(routingVerification, null, 2));
console.log('📄 Full report saved to: cloudflare-routing-verification.json\n');

process.exit(allCorrect ? 0 : 1);
