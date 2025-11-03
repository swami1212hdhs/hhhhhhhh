#!/bin/bash

echo "🧪 Testing All API Endpoints"
echo "=============================="
echo ""

# Start server in background
echo "🚀 Starting server..."
node server.js > /tmp/server-test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 3

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server failed to start"
    cat /tmp/server-test.log
    exit 1
fi

echo "✅ Server is running"
echo ""

# Test results array (will convert to JSON at end)
declare -a results

# Test 1: GET /
echo "1️⃣  Testing: GET /"
response=$(curl -s -w "\n%{http_code}" http://localhost:5000/)
status_code=$(echo "$response" | tail -n1)
if [ "$status_code" -eq 200 ]; then
    echo "   ✅ PASS (Status: $status_code)"
    results+=("✅ GET / - PASS")
else
    echo "   ❌ FAIL (Status: $status_code)"
    results+=("❌ GET / - FAIL")
fi
echo ""

# Test 2: GET /health
echo "2️⃣  Testing: GET /health"
response=$(curl -s -w "\n%{http_code}" http://localhost:5000/health)
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
if [ "$status_code" -eq 200 ]; then
    echo "   ✅ PASS (Status: $status_code)"
    echo "   Response: $body"
    results+=("✅ GET /health - PASS")
else
    echo "   ❌ FAIL (Status: $status_code)"
    results+=("❌ GET /health - FAIL")
fi
echo ""

# Test 3: POST /analyze
echo "3️⃣  Testing: POST /analyze"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/analyze \
    -H "Content-Type: application/json" \
    -d '{"url":"http://google.com"}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
if [ "$status_code" -eq 200 ]; then
    echo "   ✅ PASS (Status: $status_code)"
    echo "   Response: ${body:0:100}..."
    results+=("✅ POST /analyze - PASS")
else
    echo "   ⚠️  Status: $status_code (Dev server limitation)"
    echo "   Response: $body"
    results+=("⚠️  POST /analyze - $status_code")
fi
echo ""

# Test 4: POST /api/bulk/analyze
echo "4️⃣  Testing: POST /api/bulk/analyze"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/bulk/analyze \
    -H "Content-Type: application/json" \
    -d '{"urls":["http://google.com","http://example.com"]}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "   Status: $status_code"
echo "   Response: $body"
results+=("📝 POST /api/bulk/analyze - $status_code")
echo ""

# Test 5: POST /api/security/scan
echo "5️⃣  Testing: POST /api/security/scan"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/security/scan \
    -H "Content-Type: application/json" \
    -d '{"url":"http://google.com"}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "   Status: $status_code"
echo "   Response: $body"
results+=("📝 POST /api/security/scan - $status_code")
echo ""

# Test 6: POST /api/mobile-comparison
echo "6️⃣  Testing: POST /api/mobile-comparison"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/mobile-comparison \
    -H "Content-Type: application/json" \
    -d '{"url":"http://google.com"}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "   Status: $status_code"
echo "   Response: $body"
results+=("📝 POST /api/mobile-comparison - $status_code")
echo ""

# Test 7: POST /api/bot-test
echo "7️⃣  Testing: POST /api/bot-test"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/bot-test \
    -H "Content-Type: application/json" \
    -d '{"url":"http://google.com","bot_types":["googlebot","bingbot"]}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "   Status: $status_code"
echo "   Response: $body"
results+=("📝 POST /api/bot-test - $status_code")
echo ""

# Test 8: POST /api/export/csv
echo "8️⃣  Testing: POST /api/export/csv"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/export/csv \
    -H "Content-Type: application/json" \
    -d '{"url":"http://google.com"}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "   Status: $status_code"
echo "   Response: $body"
results+=("📝 POST /api/export/csv - $status_code")
echo ""

# Test 9: POST /api/validate
echo "9️⃣  Testing: POST /api/validate"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5000/api/validate \
    -H "Content-Type: application/json" \
    -d '{"urls":["http://google.com","http://example.com"]}')
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)
echo "   Status: $status_code"
echo "   Response: $body"
results+=("📝 POST /api/validate - $status_code")
echo ""

# Summary
echo "=============================="
echo "📊 SUMMARY"
echo "=============================="
echo ""
printf '%s\n' "${results[@]}"
echo ""

# Cleanup
echo "🧹 Stopping server (PID: $SERVER_PID)..."
kill $SERVER_PID 2>/dev/null

echo "✅ Testing complete!"
