/**
 * Complete Standalone Test Server - All 9 Endpoints Working
 * Self-contained implementation with real HTTP requests
 */

const http = require('http');
const https = require('https');
const url = require('url');

// SSRF Protection
function validateURL(urlString) {
  try {
    const parsed = new URL(urlString);
    
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

// Make HTTP/HTTPS request
function makeHttpRequest(urlString, userAgent) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlString);
    const client = parsed.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': userAgent
      },
      timeout: 10000
    };
    
    const startTime = Date.now();
    
    const req = client.get(urlString, options, (res) => {
      const responseTime = Date.now() - startTime;
      const headers = {};
      for (let [key, value] of Object.entries(res.headers)) {
        headers[key] = value;
      }
      
      resolve({
        status_code: res.statusCode,
        headers: headers,
        response_time: responseTime,
        location: res.headers.location || null
      });
      
      res.resume();
    });
    
    req.on('error', (error) => {
      resolve({
        status_code: 0,
        headers: {},
        response_time: Date.now() - startTime,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status_code: 0,
        headers: {},
        response_time: Date.now() - startTime,
        error: 'Request timeout'
      });
    });
  });
}

// Core function: Analyze redirect chain
async function analyzeRedirects(urlString, userAgent, maxRedirects = 20) {
  const chain = [];
  let currentURL = urlString;
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
          headers: {},
          domain: ''
        });
        break;
      }
      
      const response = await makeHttpRequest(currentURL, userAgent);
      const statusCode = response.status_code;
      const isRedirect = statusCode >= 300 && statusCode < 400;
      
      const step = {
        url: currentURL,
        status_code: statusCode,
        is_redirect: isRedirect,
        response_time: response.response_time,
        domain: new URL(currentURL).hostname,
        headers: response.headers
      };
      
      if (response.error) {
        step.error = response.error;
      }
      
      if (isRedirect && response.location) {
        step.location_header = response.location;
        const nextURL = new URL(response.location, currentURL).href;
        currentURL = nextURL;
        redirectCount++;
      }
      
      chain.push(step);
      
      if (!isRedirect || response.error) {
        break;
      }
    }
    
    return { success: true, chain };
  } catch (error) {
    return { success: false, error: error.message, chain };
  }
}

// Helper functions
function detectAffiliateURL(urlString, chain) {
  const affiliatePatterns = [
    /amazon.*tag=/i, /amzn\.to/i, /affiliate/i, /aff_/i,
    /clickbank/i, /shareasale/i, /cj\.com/i, /partner/i, /ref=/i
  ];
  
  const allURLs = [urlString, ...chain.map(s => s.url)].join(' ');
  return affiliatePatterns.some(pattern => pattern.test(allURLs));
}

function detectTrackingURL(urlString, chain) {
  const trackingPatterns = [
    /utm_/i, /fbclid/i, /gclid/i, /tracking/i, /track/i,
    /_ga=/i, /mc_cid/i, /mc_eid/i
  ];
  
  const allURLs = [urlString, ...chain.map(s => s.url)].join(' ');
  return trackingPatterns.some(pattern => pattern.test(allURLs));
}

function calculateSafetyScore(urlString, chain) {
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

// Create the server
const server = http.createServer(async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  console.log(`${req.method} ${path}`);
  
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  await new Promise(resolve => req.on('end', resolve));
  
  let data = {};
  if (body && req.method === 'POST') {
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
  }
  
  try {
    // ENDPOINT 1: Welcome Page
    if (path === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Redirect Chain Analyzer API</title>
  <style>
    body { font-family: Arial; max-width: 900px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    .endpoint { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>🔗 Redirect Chain Analyzer API</h1>
  <p>All 9 endpoints are working!</p>
  <h2>Available Endpoints:</h2>
  <div class="endpoint">1. GET / - Welcome page</div>
  <div class="endpoint">2. GET /health - Health check</div>
  <div class="endpoint">3. POST /analyze - Main redirect analysis</div>
  <div class="endpoint">4. POST /api/bulk/analyze - Bulk URL analysis</div>
  <div class="endpoint">5. POST /api/security/scan - Security scanning</div>
  <div class="endpoint">6. POST /api/mobile-comparison - Mobile vs Desktop</div>
  <div class="endpoint">7. POST /api/bot-test - Bot user agent testing</div>
  <div class="endpoint">8. POST /api/export/csv - CSV export</div>
  <div class="endpoint">9. POST /api/validate - URL validation</div>
</body>
</html>`);
      return;
    }
    
    // ENDPOINT 2: Health Check
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        platform: 'Node.js Test Server',
        endpoints: 9
      }));
      return;
    }
    
    // ENDPOINT 3: Main Analysis
    if (path === '/analyze' && req.method === 'POST') {
      const urlToAnalyze = data.url;
      const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      if (!urlToAnalyze) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }
      
      const result = await analyzeRedirects(urlToAnalyze, userAgent);
      
      if (!result.success) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      
      const chain = result.chain;
      const finalURL = chain[chain.length - 1]?.url || urlToAnalyze;
      const totalRedirects = chain.filter(s => s.is_redirect).length;
      
      const responseTimes = chain.map(step => step.response_time || 0);
      const totalTime = responseTimes.reduce((a, b) => a + b, 0);
      const avgTime = responseTimes.length > 0 ? totalTime / responseTimes.length : 0;
      
      const response = {
        input_url: urlToAnalyze,
        final_url: finalURL,
        redirect_chain: chain,
        total_redirects: totalRedirects,
        chain_length: chain.length,
        time_taken_per_redirect: responseTimes,
        is_affiliate_url: detectAffiliateURL(urlToAnalyze, chain),
        is_tracking_url: detectTrackingURL(urlToAnalyze, chain),
        safety_score: calculateSafetyScore(urlToAnalyze, chain),
        redirect_domains: [...new Set(chain.map(s => s.domain))],
        headers_analysis: analyzeSecurityHeaders(chain[chain.length - 1]?.headers || {}),
        performance_metrics: {
          total_response_time_ms: Math.round(totalTime),
          average_response_time_ms: Math.round(avgTime),
          fastest_step_ms: Math.min(...responseTimes),
          slowest_step_ms: Math.max(...responseTimes),
          performance_grade: avgTime < 500 ? 'A' : avgTime < 1000 ? 'B' : 'C'
        },
        timestamp: new Date().toISOString()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(response));
      return;
    }
    
    // ENDPOINT 4: Bulk Analysis
    if (path === '/api/bulk/analyze' && req.method === 'POST') {
      const urls = data.urls || [];
      const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      if (urls.length > 100) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'Maximum 100 URLs per request' }));
        return;
      }
      
      const results = [];
      
      for (const urlToAnalyze of urls) {
        const result = await analyzeRedirects(urlToAnalyze, userAgent);
        
        if (result.success && result.chain.length > 0) {
          const chain = result.chain;
          const finalURL = chain[chain.length - 1]?.url || urlToAnalyze;
          const totalRedirects = chain.filter(s => s.is_redirect).length;
          
          results.push({
            url: urlToAnalyze,
            success: true,
            final_url: finalURL,
            total_redirects: totalRedirects,
            is_affiliate_url: detectAffiliateURL(urlToAnalyze, chain),
            is_tracking_url: detectTrackingURL(urlToAnalyze, chain),
            safety_score: calculateSafetyScore(urlToAnalyze, chain)
          });
        } else {
          results.push({
            url: urlToAnalyze,
            success: false,
            error: result.error || 'Unable to analyze URL'
          });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ total_urls: urls.length, results }));
      return;
    }
    
    // ENDPOINT 5: Security Scan
    if (path === '/api/security/scan' && req.method === 'POST') {
      const urlToAnalyze = data.url;
      const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      if (!urlToAnalyze) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }
      
      const result = await analyzeRedirects(urlToAnalyze, userAgent);
      
      if (!result.success) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      
      const chain = result.chain;
      const finalURL = chain[chain.length - 1]?.url || urlToAnalyze;
      const lastHeaders = chain[chain.length - 1]?.headers || {};
      const headersAnalysis = analyzeSecurityHeaders(lastHeaders);
      
      const safetyScore = calculateSafetyScore(urlToAnalyze, chain);
      
      const securityAnalysis = {
        https_only: chain.every(s => s.url?.startsWith('https://')),
        https_downgrade_detected: chain.some((s, i) => 
          i > 0 && chain[i-1].url?.startsWith('https://') && s.url?.startsWith('http://')
        ),
        mixed_content: !chain.every(s => s.url?.startsWith('https://')),
        redirect_count: chain.filter(s => s.is_redirect).length,
        safety_score: safetyScore,
        security_headers: headersAnalysis.security_headers,
        security_score: headersAnalysis.security_score,
        threat_level: safetyScore > 80 ? 'low' : safetyScore > 50 ? 'medium' : 'high'
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({
        url: urlToAnalyze,
        final_url: finalURL,
        security_analysis: securityAnalysis,
        total_redirects: chain.filter(s => s.is_redirect).length,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // ENDPOINT 6: Mobile Comparison
    if (path === '/api/mobile-comparison' && req.method === 'POST') {
      const urlToAnalyze = data.url;
      const desktopUA = data.user_agent_desktop || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const mobileUA = data.user_agent_mobile || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15';
      
      if (!urlToAnalyze) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }
      
      const desktopResult = await analyzeRedirects(urlToAnalyze, desktopUA);
      const mobileResult = await analyzeRedirects(urlToAnalyze, mobileUA);
      
      const desktopChain = desktopResult.chain || [];
      const mobileChain = mobileResult.chain || [];
      
      const desktopFinal = desktopChain[desktopChain.length - 1]?.url || null;
      const mobileFinal = mobileChain[mobileChain.length - 1]?.url || null;
      
      const differentDestinations = desktopFinal !== mobileFinal;
      const differentRedirectCount = desktopChain.length !== mobileChain.length;
      const differentBehavior = differentDestinations || differentRedirectCount;
      
      let comparison = 'identical';
      if (differentDestinations && differentRedirectCount) {
        comparison = 'Different final destinations and different redirect paths';
      } else if (differentDestinations) {
        comparison = 'Same redirect count but different final destinations';
      } else if (differentRedirectCount) {
        comparison = 'Same final destination but different redirect paths';
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({
        url: urlToAnalyze,
        desktop: {
          final_url: desktopFinal,
          total_redirects: desktopChain.filter(s => s.is_redirect).length,
          chain_length: desktopChain.length,
          redirect_chain: desktopChain
        },
        mobile: {
          final_url: mobileFinal,
          total_redirects: mobileChain.filter(s => s.is_redirect).length,
          chain_length: mobileChain.length,
          redirect_chain: mobileChain
        },
        different_behavior: differentBehavior,
        different_destinations: differentDestinations,
        comparison: comparison,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // ENDPOINT 7: Bot Test
    if (path === '/api/bot-test' && req.method === 'POST') {
      const urlToAnalyze = data.url;
      const botTypes = data.bot_types || ['googlebot', 'bingbot', 'facebookbot'];
      
      if (!urlToAnalyze) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }
      
      const botUserAgents = {
        'googlebot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'bingbot': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'facebookbot': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'twitterbot': 'Twitterbot/1.0'
      };
      
      const normalUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const normalResult = await analyzeRedirects(urlToAnalyze, normalUA, 10);
      const normalChain = normalResult.chain || [];
      const normalFinal = normalChain[normalChain.length - 1]?.url || null;
      
      const results = {};
      let cloakingDetected = false;
      const cloakingDetails = [];
      
      for (const botType of botTypes) {
        const userAgent = botUserAgents[botType.toLowerCase()];
        if (userAgent) {
          const result = await analyzeRedirects(urlToAnalyze, userAgent, 10);
          const chain = result.chain || [];
          const botFinal = chain[chain.length - 1]?.url || null;
          
          const isDifferent = botFinal !== normalFinal;
          if (isDifferent) {
            cloakingDetected = true;
            cloakingDetails.push({
              bot: botType,
              bot_final_url: botFinal,
              normal_final_url: normalFinal
            });
          }
          
          results[botType] = {
            final_url: botFinal,
            total_redirects: chain.filter(s => s.is_redirect).length,
            chain_length: chain.length,
            success: result.success,
            different_from_normal_user: isDifferent
          };
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({
        url: urlToAnalyze,
        bot_results: results,
        normal_user_result: {
          final_url: normalFinal,
          total_redirects: normalChain.filter(s => s.is_redirect).length,
          chain_length: normalChain.length
        },
        cloaking_detected: cloakingDetected,
        cloaking_details: cloakingDetected ? cloakingDetails : [],
        summary: cloakingDetected 
          ? `Cloaking detected: ${cloakingDetails.length} bot(s) see different content`
          : 'No cloaking detected',
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // ENDPOINT 8: Export CSV
    if (path === '/api/export/csv' && req.method === 'POST') {
      const urlToAnalyze = data.url;
      const userAgent = data.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      
      if (!urlToAnalyze) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'URL is required' }));
        return;
      }
      
      const result = await analyzeRedirects(urlToAnalyze, userAgent);
      
      if (!result.success) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: result.error }));
        return;
      }
      
      let csv = 'Step,URL,Status Code,Domain,Response Time (ms),Location Header,Is HTTPS\n';
      
      result.chain.forEach((step, idx) => {
        const isHttps = step.url?.startsWith('https://') ? 'Yes' : 'No';
        const location = step.location_header || '';
        csv += `${idx + 1},"${step.url}",${step.status_code},"${step.domain}",${step.response_time},"${location}",${isHttps}\n`;
      });
      
      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="redirect_analysis_${Date.now()}.csv"`,
        ...corsHeaders
      });
      res.end(csv);
      return;
    }
    
    // ENDPOINT 9: URL Validation
    if (path === '/api/validate' && req.method === 'POST') {
      const urls = data.urls || [];
      
      if (urls.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders });
        res.end(JSON.stringify({ error: 'URLs array is required' }));
        return;
      }
      
      const results = [];
      
      for (const urlToCheck of urls) {
        const result = await analyzeRedirects(urlToCheck, 'Mozilla/5.0 (Validator)', 1);
        
        if (result.success && result.chain.length > 0) {
          const step = result.chain[0];
          results.push({
            url: urlToCheck,
            accessible: step.status_code < 400,
            status_code: step.status_code
          });
        } else {
          results.push({
            url: urlToCheck,
            accessible: false,
            status_code: 0,
            error: result.error
          });
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ results }));
      return;
    }
    
    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Redirect Chain Analyzer - All 9 Endpoints Working       ║
╠═══════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                          ║
║  Status: All endpoints ready for testing                  ║
╠═══════════════════════════════════════════════════════════╣
║  1. GET  /                    - Welcome page               ║
║  2. GET  /health              - Health check               ║
║  3. POST /analyze             - Main redirect analysis     ║
║  4. POST /api/bulk/analyze    - Bulk URL analysis          ║
║  5. POST /api/security/scan   - Security scanning          ║
║  6. POST /api/mobile-comparison - Mobile vs Desktop        ║
║  7. POST /api/bot-test        - Bot user agent testing     ║
║  8. POST /api/export/csv      - CSV export                 ║
║  9. POST /api/validate        - URL validation             ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
