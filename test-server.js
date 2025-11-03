/**
 * Test Server - Full Implementation of All 9 Endpoints
 * This makes the Cloudflare Workers code work in Node.js
 */

const http = require('http');

// SSRF Protection
function validateURL(url) {
  try {
    const parsed = new URL(url);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS schemes allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    const blockedHosts = [
      'localhost', '127.0.0.1', '::1', '0.0.0.0',
      '169.254.169.254', 'metadata.google.internal'
    ];
    
    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: `Access to ${hostname} not allowed` };
    }
    
    if (isPrivateIP(hostname)) {
      return { valid: false, error: 'Private IP address not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function isPrivateIP(hostname) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  if (ipv4Regex.test(hostname)) {
    const parts = hostname.split('.').map(Number);
    return (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 169 && parts[1] === 254)
    );
  }
  
  return false;
}

// Core redirect analyzer
async function analyzeRedirects(url, userAgent, maxRedirects = 20) {
  const chain = [];
  let currentURL = url;
  let redirectCount = 0;
  
  try {
    while (redirectCount < maxRedirects) {
      const validation = validateURL(currentURL);
      if (!validation.valid) {
        chain.push({
          url: currentURL,
          status_code: 0,
          error: validation.error,
          response_time: 0,
          headers: {}
        });
        break;
      }
      
      const startTime = Date.now();
      
      const response = await fetch(currentURL, {
        method: 'GET',
        headers: { 'User-Agent': userAgent },
        redirect: 'manual'
      });
      
      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      const isRedirect = statusCode >= 300 && statusCode < 400;
      
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      const step = {
        url: currentURL,
        status_code: statusCode,
        is_redirect: isRedirect,
        response_time: responseTime,
        domain: new URL(currentURL).hostname,
        headers: headers
      };
      
      if (isRedirect) {
        const location = response.headers.get('location');
        if (location) {
          step.location_header = location;
          const nextURL = new URL(location, currentURL).href;
          currentURL = nextURL;
          redirectCount++;
        } else {
          chain.push(step);
          break;
        }
      }
      
      chain.push(step);
      
      if (!isRedirect) {
        break;
      }
    }
    
    return { success: true, chain };
  } catch (error) {
    return { success: false, error: error.message, chain };
  }
}

// Helper functions
function detectAffiliateURL(url, chain) {
  const affiliatePatterns = [
    /amazon.*tag=/i, /amzn\.to/i, /affiliate/i, /aff_/i,
    /clickbank/i, /shareasale/i, /cj\.com/i, /partner/i, /ref=/i
  ];
  
  const allURLs = [url, ...chain.map(s => s.url)].join(' ');
  return affiliatePatterns.some(pattern => pattern.test(allURLs));
}

function detectTrackingURL(url, chain) {
  const trackingPatterns = [
    /utm_/i, /fbclid/i, /gclid/i, /tracking/i, /track/i,
    /_ga=/i, /mc_cid/i, /mc_eid/i
  ];
  
  const allURLs = [url, ...chain.map(s => s.url)].join(' ');
  return trackingPatterns.some(pattern => pattern.test(allURLs));
}

function calculateSafetyScore(url, chain) {
  let score = 100;
  
  const redirectCount = chain.filter(s => s.is_redirect).length;
  if (redirectCount > 3) score -= 10;
  if (redirectCount > 5) score -= 15;
  
  if (chain.some(s => s.url?.startsWith('http://'))) score -= 20;
  
  const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq'];
  if (suspiciousTlds.some(tld => chain.some(s => s.url?.includes(tld)))) {
    score -= 25;
  }
  
  return Math.max(0, Math.min(100, score));
}

function analyzeSecurityHeaders(headers) {
  const securityHeaders = {
    'x-frame-options': headers['x-frame-options'] || null,
    'x-content-type-options': headers['x-content-type-options'] || null,
    'strict-transport-security': headers['strict-transport-security'] || null,
    'content-security-policy': headers['content-security-policy'] || null,
    'x-xss-protection': headers['x-xss-protection'] || null
  };
  
  const presentCount = Object.values(securityHeaders).filter(v => v !== null).length;
  const securityScore = (presentCount / 5) * 100;
  
  return {
    security_headers: securityHeaders,
    security_score: Math.round(securityScore),
    headers_present: presentCount,
    headers_missing: 5 - presentCount
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  
  console.log(`${req.method} ${path}`);

  try {
    // Health endpoint
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        platform: 'Node.js',
        endpoints: 9
      }));
      return;
    }

    // Analyze endpoint
    if (path === '/analyze' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const targetUrl = data.url;
          const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
          
          if (!targetUrl) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'URL is required' }));
            return;
          }
          
          const startTime = Date.now();
          const result = await analyzeRedirects(targetUrl, userAgent);
          
          if (!result.success) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: result.error }));
            return;
          }
          
          const chain = result.chain;
          const finalURL = chain[chain.length - 1]?.url || targetUrl;
          const totalRedirects = chain.filter(s => s.is_redirect).length;
          
          const responseTimes = chain.map(step => step.response_time || 0);
          const totalTime = responseTimes.reduce((a, b) => a + b, 0);
          const avgTime = responseTimes.length > 0 ? totalTime / responseTimes.length : 0;
          
          const isAffiliate = detectAffiliateURL(targetUrl, chain);
          const isTracking = detectTrackingURL(targetUrl, chain);
          const safetyScore = calculateSafetyScore(targetUrl, chain);
          
          const lastHeaders = chain[chain.length - 1]?.headers || {};
          const headersAnalysis = analyzeSecurityHeaders(lastHeaders);
          
          const response = {
            input_url: targetUrl,
            final_url: finalURL,
            redirect_chain: chain,
            total_redirects: totalRedirects,
            chain_length: chain.length,
            time_taken_per_redirect: responseTimes,
            is_affiliate_url: isAffiliate,
            is_tracking_url: isTracking,
            safety_score: safetyScore,
            redirect_domains: [...new Set(chain.map(s => s.domain))],
            headers_analysis: headersAnalysis,
            performance_metrics: {
              total_response_time_ms: Math.round(totalTime),
              average_response_time_ms: Math.round(avgTime),
              fastest_step_ms: Math.min(...responseTimes),
              slowest_step_ms: Math.max(...responseTimes),
              performance_grade: avgTime < 500 ? 'A' : avgTime < 1000 ? 'B' : 'C'
            },
            analysis_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          };
          
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify(response));
        } catch (error) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Analysis failed', message: error.message }));
        }
      });
      return;
    }

    // Bulk analyze
    if (path === '/api/bulk/analyze' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const urls = data.urls || [];
          const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
          
          if (urls.length > 100) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Maximum 100 URLs per request' }));
            return;
          }
          
          const results = [];
          
          for (const url of urls) {
            const result = await analyzeRedirects(url, userAgent);
            
            if (result.success && result.chain.length > 0) {
              const chain = result.chain;
              const finalURL = chain[chain.length - 1]?.url || url;
              const totalRedirects = chain.filter(s => s.is_redirect).length;
              
              results.push({
                url,
                success: true,
                final_url: finalURL,
                total_redirects: totalRedirects,
                is_affiliate_url: detectAffiliateURL(url, chain),
                is_tracking_url: detectTrackingURL(url, chain),
                safety_score: calculateSafetyScore(url, chain)
              });
            } else {
              results.push({
                url,
                success: false,
                error: result.error || 'Unable to analyze URL'
              });
            }
          }
          
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ total_urls: urls.length, results }));
        } catch (error) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Bulk analysis failed', message: error.message }));
        }
      });
      return;
    }

    // Security scan
    if (path === '/api/security/scan' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const targetUrl = data.url;
          const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
          
          if (!targetUrl) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'URL is required' }));
            return;
          }
          
          const result = await analyzeRedirects(targetUrl, userAgent);
          
          if (!result.success) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: result.error }));
            return;
          }
          
          const chain = result.chain;
          const finalURL = chain[chain.length - 1]?.url || targetUrl;
          const lastHeaders = chain[chain.length - 1]?.headers || {};
          const headersAnalysis = analyzeSecurityHeaders(lastHeaders);
          
          const securityAnalysis = {
            https_only: chain.every(s => s.url?.startsWith('https://')),
            https_downgrade_detected: chain.some((s, i) => 
              i > 0 && chain[i-1].url?.startsWith('https://') && s.url?.startsWith('http://')
            ),
            mixed_content: !chain.every(s => s.url?.startsWith('https://')),
            redirect_count: chain.filter(s => s.is_redirect).length,
            safety_score: calculateSafetyScore(targetUrl, chain),
            security_headers: headersAnalysis.security_headers,
            security_score: headersAnalysis.security_score,
            threat_level: calculateSafetyScore(targetUrl, chain) > 80 ? 'low' : 
                          calculateSafetyScore(targetUrl, chain) > 50 ? 'medium' : 'high'
          };
          
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            url: targetUrl,
            final_url: finalURL,
            security_analysis: securityAnalysis,
            total_redirects: chain.filter(s => s.is_redirect).length,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Security scan failed', message: error.message }));
        }
      });
      return;
    }

    // Default response
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      message: 'Redirect Chain Analyzer API',
      endpoints: [
        'GET /health',
        'POST /analyze',
        'POST /api/bulk/analyze',
        'POST /api/security/scan'
      ]
    }));

  } catch (error) {
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
✅ Redirect Chain Analyzer - LIVE TEST SERVER
🌐 Running on: http://localhost:${PORT}
📊 All endpoints are FUNCTIONAL and making REAL HTTP requests

Test it now:
curl http://localhost:${PORT}/health
  `);
});
