#!/bin/bash
# Test SECOND BATCH of CORS proxies against AfterDark API
# Target URL
TARGET="https://afterdark.mom/api/sources/movies?tmdbId=1315702&title=The%20Residence&year=2025&originalTitle=Dalloway"
ENCODED_TARGET=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TARGET', safe=''))")

echo "🧪 Testing CORS proxies (BATCH 2) against AfterDark API..."
echo "Target: $TARGET"
echo ""

# NEW List of CORS proxies to test (30 more alternatives)
PROXIES=(
    # Various CORS proxy services
    "cors-proxy.taskcluster|https://cors-proxy.taskcluster.net/{URL}"
    "cors.bridged.cc|https://cors.bridged.cc/{URL}"
    "api.scraperapi|https://api.scraperapi.com?api_key=free&url={ENCODED}"
    "cors-proxy-server|https://cors-proxy-server.onrender.com/{URL}"
    "cors.edstem|https://cors.edstem.org/{URL}"
    "proxy.notus|https://proxy.notus.tech/{URL}"
    "corsproxy.onrender|https://corsproxy.onrender.com/{URL}"
    "cors-proxy-alpha|https://cors-proxy-alpha.herokuapp.com/{URL}"
    "cors.builtwithdark|https://cors.builtwithdark.com/{URL}"
    "cors-proxy-workers|https://cors-proxy.workers.dev/{URL}"
    "proxy.scrapeops|https://proxy.scrapeops.io/v1/?api_key=free&url={ENCODED}"
    "cors-get-proxy|https://cors-get-proxy.sirjosh.workers.dev/?url={ENCODED}"
    "corsproxy-any|https://corsproxy-any.herokuapp.com/{URL}"
    "cors-hijacker|https://cors-hijacker.nodejitsu.com/{URL}"
    "proxify.now|https://proxify.now.sh/{URL}"
    "cors-proxy-demo|https://cors-proxy-demo.herokuapp.com/{URL}"
    "api.zenrows|https://api.zenrows.com/v1/?apikey=free&url={ENCODED}"
    "cors.isomorphic-git|https://cors.isomorphic-git.org/{URL}"
    "jsonproxy|https://jsonproxy.builtwithdark.com/{URL}"
    "bypass-cors.party|https://bypass-cors.party/{URL}"
    "cors-container|https://cors-container.herokuapp.com/{URL}"
    "simple-cors|https://simple-cors-proxy.herokuapp.com/{URL}"
    "cors.deno.dev|https://cors.deno.dev/{URL}"
    "api.codetabs-v2|https://api.codetabs.com/v2/proxy?url={ENCODED}"
    "rss-proxy|https://rss-proxy.herokuapp.com/{URL}"
    "cors-lit|https://cors.lit.workers.dev/{URL}"
    "proxy.prox|https://proxy.prox.workers.dev/{URL}"
    "api.proxynova|https://api.proxynova.com/proxyserver.php?v=3&u={ENCODED}"
    "cors-anywhere-cloudflare|https://cors-anywhere-cloudflare.workers.dev/{URL}"
    "universal-api-cors|https://universal-api-cors.herokuapp.com/{URL}"
)

SUCCESS_COUNT=0
FAILED_COUNT=0
WORKING_PROXIES=()

for proxy_info in "${PROXIES[@]}"; do
    IFS='|' read -r name url_template <<< "$proxy_info"
    
    # Replace placeholders
    proxy_url="${url_template/\{URL\}/$TARGET}"
    proxy_url="${proxy_url/\{ENCODED\}/$ENCODED_TARGET}"
    
    echo -n "Testing $name... "
    
    # Make request with timeout
    response=$(curl -s --max-time 10 "$proxy_url" \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        -H "Origin: https://afterdark.mom" \
        -H "Referer: https://afterdark.mom/" 2>/dev/null)
    
    # Check if response contains expected JSON structure
    if echo "$response" | grep -q '"sources"'; then
        echo "✅ SUCCESS"
        echo "   Preview: ${response:0:150}..."
        WORKING_PROXIES+=("$name: $url_template")
        ((SUCCESS_COUNT++))
    elif echo "$response" | grep -q "Cloudflare"; then
        echo "❌ Cloudflare block"
        ((FAILED_COUNT++))
    elif echo "$response" | grep -q "blocked"; then
        echo "❌ Blocked"
        ((FAILED_COUNT++))
    elif echo "$response" | grep -q "403"; then
        echo "❌ 403 Forbidden"
        ((FAILED_COUNT++))
    elif [ -z "$response" ]; then
        echo "❌ No response / Timeout"
        ((FAILED_COUNT++))
    else
        echo "❌ Unknown error"
        echo "   Preview: ${response:0:100}"
        ((FAILED_COUNT++))
    fi
done

echo ""
echo "================================"
echo "Results: $SUCCESS_COUNT success, $FAILED_COUNT failed"
echo "================================"

if [ ${#WORKING_PROXIES[@]} -gt 0 ]; then
    echo ""
    echo "🎉 WORKING PROXIES:"
    for proxy in "${WORKING_PROXIES[@]}"; do
        echo "  - $proxy"
    done
fi
