# 🚀 Deploy to Cloudflare Workers - Simple Guide

**Deploy File:** `worker-clean.js`  
**Config File:** `wrangler-clean.toml`  
**Total Endpoints:** 9 (all working with real data)

---

## ⚡ Quick Deploy (3 Steps)

### Step 1: Install Wrangler (if needed)
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```
This opens your browser to authenticate with Cloudflare (free account works!)

### Step 3: Deploy
```bash
wrangler deploy worker-clean.js --config wrangler-clean.toml
```

**Done!** Your API is now live globally! 🎉

---

## 🌐 Your Live API URL

After deployment, Cloudflare will give you a URL like:
```
https://redirect-analyzer.<your-subdomain>.workers.dev
```

### Test It:
```bash
# Test health check
curl https://redirect-analyzer.<your-subdomain>.workers.dev/health

# Test URL analysis
curl -X POST https://redirect-analyzer.<your-subdomain>.workers.dev/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"http://google.com"}'
```

---

## 📋 What Gets Deployed

### Files:
- ✅ `worker-clean.js` - The entire API (9 endpoints)
- ✅ `wrangler-clean.toml` - Configuration

### NOT Needed:
- ❌ No Python files
- ❌ No database
- ❌ No KV storage
- ❌ No environment setup
- ❌ No server management

---

## 🎯 All 9 Endpoints (Live)

Once deployed, you have:

1. **GET /** - Welcome page
2. **GET /health** - Health check
3. **POST /analyze** - Main redirect analysis
4. **POST /api/bulk/analyze** - Bulk URL analysis
5. **POST /api/security/scan** - Security scanning
6. **POST /api/mobile-comparison** - Mobile vs desktop
7. **POST /api/bot-test** - Bot user agent testing
8. **POST /api/export/csv** - Export to CSV
9. **POST /api/validate** - URL validation

---

## 💰 Cost: FREE

### Free Tier Includes:
- ✅ **100,000 requests/day**
- ✅ **3 million requests/month**
- ✅ **Global deployment** (200+ locations)
- ✅ **Automatic scaling**
- ✅ **HTTPS included**
- ✅ **No credit card required**

### If You Need More:
- **Paid Plan:** $5/month
- **Includes:** 10 million requests/month
- **Overage:** $0.50 per million additional requests

---

## 🔧 Update Your API

Made changes to `worker-clean.js`? Just redeploy:

```bash
wrangler deploy worker-clean.js --config wrangler-clean.toml
```

Changes are live in seconds!

---

## 📊 Monitor Your API

### View Analytics:
```bash
wrangler tail redirect-analyzer
```

### Check Deployment Status:
```bash
wrangler deployments list
```

### View Live Logs:
```bash
wrangler tail redirect-analyzer --format pretty
```

---

## 🌍 Custom Domain (Optional)

Want to use your own domain? 

### In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Click your worker (`redirect-analyzer`)
3. Go to Settings → Triggers
4. Add Custom Domain
5. Enter your domain (e.g., `api.yourdomain.com`)

Done! Your API is now at `https://api.yourdomain.com`

---

## 🔐 Security Features (Built-in)

All deployed:
- ✅ SSRF protection
- ✅ Private IP blocking
- ✅ HTTPS only
- ✅ CORS enabled
- ✅ Rate limiting (Cloudflare automatic)
- ✅ DDoS protection (Cloudflare automatic)

---

## ❓ Troubleshooting

### Problem: "wrangler: command not found"
**Solution:**
```bash
npm install -g wrangler
```

### Problem: "Not logged in"
**Solution:**
```bash
wrangler login
```

### Problem: "Build failed"
**Solution:** Make sure you're deploying the correct file:
```bash
wrangler deploy worker-clean.js --config wrangler-clean.toml
```

### Problem: "API returns 404"
**Solution:** Check your URL matches the deployment URL exactly

---

## 📖 Example Usage After Deployment

### Python:
```python
import requests

# Replace with your actual worker URL
API_URL = "https://redirect-analyzer.your-subdomain.workers.dev"

# Analyze a URL
response = requests.post(
    f"{API_URL}/analyze",
    json={"url": "http://example.com"}
)
print(response.json())
```

### JavaScript/Node.js:
```javascript
const API_URL = "https://redirect-analyzer.your-subdomain.workers.dev";

const analyzeURL = async (url) => {
  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return await response.json();
};

analyzeURL("http://example.com").then(console.log);
```

### cURL:
```bash
curl -X POST https://redirect-analyzer.your-subdomain.workers.dev/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"http://example.com"}'
```

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Health check works: `GET /health`
- [ ] Main analysis works: `POST /analyze`
- [ ] Returns real redirect chains (not simulated)
- [ ] HTTPS is enabled
- [ ] Global deployment (test from different locations)
- [ ] Response time < 100ms

---

## 📞 Need Help?

- **Cloudflare Docs:** https://developers.cloudflare.com/workers/
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/
- **Community:** https://discord.gg/cloudflaredev

---

## ✅ Summary

You now have a **production-ready API** with:
- 9 working endpoints
- 100% real data (no simulations)
- Global deployment
- 100,000 free requests/day
- Automatic scaling
- Built-in security

**Deploy command:**
```bash
wrangler deploy worker-clean.js --config wrangler-clean.toml
```

That's it! 🚀
