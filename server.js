/**
 * Local Development Server for Redirect Chain Analyzer
 * This simulates Cloudflare Workers environment locally
 * Run with: node server.js
 */

const http = require('http');

// Import the worker (we'll use a modified version that works in Node.js)
const workerCode = require('fs').readFileSync('./worker-clean.js', 'utf-8');

// Simple HTTP server to test the API locally
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${req.method} ${req.url}`);

  // Route requests
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Simple routing for testing
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      platform: 'Node.js (Development)',
      endpoints: 9,
      message: 'For production, deploy to Cloudflare Workers'
    }));
    return;
  }

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirect Chain Analyzer - Local Dev</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #333; }
          .info { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>🔗 Redirect Chain Analyzer API</h1>
        <div class="info">
          <strong>⚠️ Local Development Server</strong>
          <p>This is a simple development server for testing. For production, deploy to Cloudflare Workers.</p>
        </div>
        
        <h2>Quick Test</h2>
        <p>Test the health endpoint:</p>
        <code>curl http://localhost:5000/health</code>
        
        <h2>Deploy to Production</h2>
        <p>Deploy to Cloudflare Workers for full functionality:</p>
        <code>wrangler deploy worker-clean.js --config wrangler-clean.toml</code>
        
        <h2>Available Endpoints (9 Total)</h2>
        <ul>
          <li>GET / - This page</li>
          <li>GET /health - Health check</li>
          <li>POST /analyze - Main redirect analysis (deploy to Cloudflare for full functionality)</li>
          <li>POST /api/bulk/analyze - Bulk analysis</li>
          <li>POST /api/security/scan - Security scanning</li>
          <li>POST /api/mobile-comparison - Mobile vs desktop</li>
          <li>POST /api/bot-test - Bot user agent testing</li>
          <li>POST /api/export/csv - CSV export</li>
          <li>POST /api/validate - URL validation</li>
        </ul>
        
        <p><strong>Note:</strong> Full functionality requires Cloudflare Workers deployment.</p>
      </body>
      </html>
    `);
    return;
  }

  // For all other endpoints, suggest deploying to Cloudflare
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'This endpoint requires Cloudflare Workers deployment',
    endpoint: url.pathname,
    action: 'Deploy to Cloudflare Workers for full API functionality',
    command: 'wrangler deploy worker-clean.js --config wrangler-clean.toml'
  }));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  Redirect Chain Analyzer - Local Dev Server           ║
╠════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}            ║
║  Health check: http://localhost:${PORT}/health          ║
╠════════════════════════════════════════════════════════╣
║  ⚠️  This is a development server                      ║
║  For production, deploy to Cloudflare Workers:         ║
║  wrangler deploy worker-clean.js --config ...          ║
╚════════════════════════════════════════════════════════╝
  `);
});
