#!/bin/bash
# Test THIRD BATCH of CORS proxies against AfterDark API
TARGET="https://afterdark.mom/api/sources/movies?tmdbId=1315702&title=The%20Residence&year=2025&originalTitle=Dalloway"
ENCODED_TARGET=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TARGET', safe=''))")

echo "🧪 Testing CORS proxies (BATCH 3) against AfterDark API..."
echo "Target: $TARGET"
echo ""

# THIRD batch of CORS proxies (30 more alternatives)
PROXIES=(
    "proxy.webshare|https://proxy.webshare.io/get?url={ENCODED}"
    "cors-fetch|https://cors-fetch.workers.dev/{URL}"
    "proxy.technitium|https://proxy.technitium.com/?url={ENCODED}"
    "cors-proxy-io|https://cors-proxy.io/?{URL}"
    "anyproxy.io|https://anyproxy.io/{URL}"
    "proxy.hoppscotch|https://proxy.hoppscotch.io/{URL}"
    "bypass-cors|https://bypass-cors.herokuapp.com/{URL}"
    "cors.plus|https://cors.plus/{URL}"
    "proxy.webpackbin|https://proxy.webpackbin.com/{URL}"
    "api.proxyscrape|https://api.proxyscrape.com/v2/?request=get&url={ENCODED}"
    "cors.hackafe|https://cors.hackafe.io/{URL}"
    "proxy.scraper|https://proxy.scraper.dev/?url={ENCODED}"
    "cors-proxy-lite|https://cors-proxy-lite.glitch.me/{URL}"
    "api.geonode|https://api.geonode.com/v1/?url={ENCODED}"
    "cors-anywhere-lite|https://cors-anywhere-lite.herokuapp.com/{URL}"
    "proxy.smartproxy|https://proxy.smartproxy.com/?url={ENCODED}"
    "cors-proxy-slim|https://cors-proxy-slim.herokuapp.com/{URL}"
    "api.brightdata|https://api.brightdata.com/v1/?url={ENCODED}"
    "cors-proxy-fast|https://cors-proxy-fast.herokuapp.com/{URL}"
    "proxy.oxylabs|https://proxy.oxylabs.io/?url={ENCODED}"
    "cors-proxy-quick|https://cors-proxy-quick.herokuapp.com/{URL}"
    "api.infatica|https://api.infatica.io/v1/?url={ENCODED}"
    "cors-proxy-simple|https://cors-proxy-simple.herokuapp.com/{URL}"
    "proxy.netnut|https://proxy.netnut.io/?url={ENCODED}"
    "cors-proxy-mini|https://cors-proxy-mini.herokuapp.com/{URL}"
    "api.shifter|https://api.shifter.io/v1/?url={ENCODED}"
    "cors-proxy-basic|https://cors-proxy-basic.herokuapp.com/{URL}"
    "proxy.packetstream|https://proxy.packetstream.io/?url={ENCODED}"
    "cors-proxy-free|https://cors-proxy-free.herokuapp.com/{URL}"
    "api.rayobyte|https://api.rayobyte.com/v1/?url={ENCODED}"
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
