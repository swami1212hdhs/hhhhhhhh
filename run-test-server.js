const http = require('http');
const fs = require('fs');

// Load worker code
const workerCode = fs.readFileSync('./worker-clean.js', 'utf-8');
const moduleCode = workerCode.replace('export default', 'module.exports =');
fs.writeFileSync('/tmp/worker.js', moduleCode);
const worker = require('/tmp/worker.js');

const server = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    const mockReq = {
      url: `http://localhost:5000${req.url}`,
      method: req.method,
      headers: new Map(Object.entries(req.headers)),
      json: async () => body ? JSON.parse(body) : {},
      text: async () => body
    };
    
    try {
      const response = await worker.fetch(mockReq, {}, {});
      const text = await response.text();
      const headers = {};
      if (response.headers && response.headers.forEach) {
        response.headers.forEach((v, k) => headers[k] = v);
      }
      res.writeHead(response.status || 200, headers);
      res.end(text);
    } catch (e) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({error: e.message}));
    }
  });
});

server.listen(5000, '0.0.0.0', () => {
  console.log('✅ Test server running on http://0.0.0.0:5000');
});
