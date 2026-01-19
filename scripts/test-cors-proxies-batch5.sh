#!/bin/bash
# Test FIFTH BATCH of CORS proxies against AfterDark API
TARGET="https://afterdark.mom/api/sources/movies?tmdbId=1315702&title=The%20Residence&year=2025&originalTitle=Dalloway"
ENCODED_TARGET=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TARGET', safe=''))")

echo "🧪 Testing CORS proxies (BATCH 5) against AfterDark API..."
echo "Target: $TARGET"
echo ""

# FIFTH batch - different domain extensions and variations
PROXIES=(
    "cors-anywhere.app|https://cors-anywhere.app/{URL}"
    "proxy.cors-anywhere.xyz|https://proxy.cors-anywhere.xyz/{URL}"
    "cors.now.sh|https://cors.now.sh/{URL}"
    "api.cors-anywhere.tk|https://api.cors-anywhere.tk/{URL}"
    "cors-proxy.run|https://cors-proxy.run/{URL}"
    "proxy.cors.ml|https://proxy.cors.ml/{URL}"
    "cors-anywhere.ga|https://cors-anywhere.ga/{URL}"
    "api.cors-proxy.gq|https://api.cors-proxy.gq/{URL}"
    "cors.proxy.cf|https://cors.proxy.cf/{URL}"
    "api.corsanywhere.ml|https://api.corsanywhere.ml/{URL}"
    "cors-proxy.tk|https://cors-proxy.tk/{URL}"
    "proxy.cors.gq|https://proxy.cors.gq/{URL}"
    "cors-anywhere.cf|https://cors-anywhere.cf/{URL}"
    "api.cors.ga|https://api.cors.ga/{URL}"
    "cors.proxy.ml|https://cors.proxy.ml/{URL}"
    "proxy.corsanywhere.ga|https://proxy.corsanywhere.ga/{URL}"
    "cors-proxy.cf|https://cors-proxy.cf.workers.dev/{URL}"
    "api.cors.tk|https://api.cors.tk/{URL}"
    "cors.anywhere.gq|https://cors.anywhere.gq/{URL}"
    "proxy.cors.cf|https://proxy.cors.cf/{URL}"
    "cors-anywhere.ml|https://cors-anywhere.ml/{URL}"
    "api.cors.cf|https://api.cors.cf/{URL}"
    "cors.proxy.ga|https://cors.proxy.ga/{URL}"
    "proxy.cors.tk|https://proxy.cors.tk/{URL}"
    "cors-anywhere.gq|https://cors-anywhere.gq/{URL}"
    "api.cors.ml|https://api.cors.ml/{URL}"
    "cors.proxy.tk|https://cors.proxy.tk/{URL}"
    "proxy.corsanywhere.cf|https://proxy.corsanywhere.cf/{URL}"
    "cors-proxy.ga|https://cors-proxy.ga/{URL}"
    "api.corsanywhere.gq|https://api.corsanywhere.gq/{URL}"
)

SUCCESS_COUNT=0
FAILED_COUNT=0
WORKING_PROXIES=()

for proxy_info in "${PROXIES[@]}"; do
    IFS='|' read -r name url_template <<< "$proxy_info"
    
    proxy_url="${url_template/\{URL\}/$TARGET}"
    proxy_url="${proxy_url/\{ENCODED\}/$ENCODED_TARGET}"
    
    echo -n "Testing $name... "
    
    response=$(curl -s --max-time 10 "$proxy_url" \
        -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
        -H "Origin: https://afterdark.mom" \
        -H "Referer: https://afterdark.mom/" 2>/dev/null)
    
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
        echo "   Preview: ${response:0:80}"
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
