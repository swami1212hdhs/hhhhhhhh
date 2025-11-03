/**
 * Full Local Test Server - Tests all 9 endpoints from worker-clean.js
 * Simulates Cloudflare Workers environment in Node.js
 */

const http = require('http');

// Import all the core functions we need by evaluating worker-clean.js content
const fs = require('fs');
const workerCode = fs.readFileSync('./worker-clean.js', 'utf-8');

// Extract and evaluate the worker functions
// We'll create a mock environment for Cloudflare Workers
const mockEnv = {};
const mockCtx = {};

// Create request handler that uses the worker logic
async function handleRequest(req, res) {
  // Build request URL
  const protocol = 'http';
  const host = req.headers.host || 'localhost:5000';
  const fullUrl = `${protocol}://${host}${req.url}`;
  
  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      // Create a Request object similar to Cloudflare Workers
      const mockRequest = {
        url: fullUrl,
        method: req.method,
        headers: new Map(Object.entries(req.headers)),
        async json() {
          try {
            return JSON.parse(body);
          } catch (e) {
            return {};
          }
        }
      };
      
      // Get headers helper
      mockRequest.headers.get = function(name) {
        return this.get(name.toLowerCase()) || null;
      };
      
      // Route to appropriate handler
      const url = new URL(fullUrl);
      const path = url.pathname;
      const method = req.method;
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };
      
      if (method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
      }
      
      // Import the worker handler dynamically
      const worker = await import('./worker-clean.js');
      
      // Call the worker's fetch handler
      const response = await worker.default.fetch(mockRequest, mockEnv, mockCtx);
      
      // Convert Response to http.ServerResponse
      const responseBody = await response.text();
      const responseHeaders = {};
      
      // Copy headers from Response
      for (const [key, value] of response.headers.entries()) {
        responseHeaders[key] = value;
      }
      
      res.writeHead(response.status, responseHeaders);
      res.end(responseBody);
      
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack
      }));
    }
  });
}

const server = http.createServer(handleRequest);
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Redirect Chain Analyzer - Full Test Server              ║
╠═══════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                          ║
║  All 9 endpoints available for testing                    ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║  GET  /                     - Documentation                ║
║  GET  /health               - Health check                 ║
║  POST /analyze              - Main analysis                ║
║  POST /api/bulk/analyze     - Bulk analysis                ║
║  POST /api/security/scan    - Security scan                ║
║  POST /api/mobile-comparison - Mobile vs Desktop           ║
║  POST /api/bot-test         - Bot testing                  ║
║  POST /api/export/csv       - CSV export                   ║
║  POST /api/validate         - URL validation               ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
