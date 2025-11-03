# 🔗 Redirect Chain Analyzer API

**JavaScript-Only Version** - Optimized for Cloudflare Workers

A professional URL redirect chain analyzer that traces redirect paths, analyzes security, detects affiliate links, and provides comprehensive insights. Built entirely in JavaScript for global edge deployment.

## 🚀 Features

- **Complete Redirect Analysis**: Trace every redirect step with detailed timing and metadata
- **Real HTTP Requests**: No simulated data - all endpoints return real data
- **URL Intelligence**: Detect affiliate links, tracking parameters, and suspicious patterns
- **Safety Scoring**: 0-100 safety score based on actual security analysis
- **SSRF Protection**: Blocks private IPs, localhost, and metadata endpoints
- **CORS Enabled**: Ready for web application integration
- **Global Deployment**: Runs on Cloudflare's edge network (200+ locations)
- **100% Real Data**: Zero simulated or fake data

## 🛠️ Tech Stack

- **Runtime**: Cloudflare Workers (JavaScript)
- **HTTP Client**: Native fetch() API
- **Database**: None needed (stateless API)
- **Deployment**: Global edge computing
- **Language**: Pure JavaScript (no Python)

## 📦 Quick Start

### Deploy to Cloudflare Workers (Production)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler deploy worker-clean.js --config wrangler-clean.toml
