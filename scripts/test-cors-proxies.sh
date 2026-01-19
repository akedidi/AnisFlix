#!/bin/bash
# Test multiple CORS proxies against AfterDark API
# Target URL
TARGET="https://afterdark.mom/api/sources/movies?tmdbId=1315702&title=The%20Residence&year=2025&originalTitle=Dalloway"
ENCODED_TARGET=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TARGET', safe=''))")

echo "🧪 Testing CORS proxies against AfterDark API..."
echo "Target: $TARGET"
echo ""

# List of CORS proxies to test
PROXIES=(
    # Format: "name|url_template" where {URL} or {ENCODED} will be replaced
    "corsproxy.io|https://corsproxy.io/?{URL}"
    "cors.eu.org|https://cors.eu.org/{URL}"
    "allorigins|https://api.allorigins.win/raw?url={ENCODED}"
    "codetabs|https://api.codetabs.com/v1/proxy?quest={ENCODED}"
    "thingproxy|https://thingproxy.freeboard.io/fetch/{URL}"
    "cors-anywhere-herokuapp|https://cors-anywhere.herokuapp.com/{URL}"
    "crossorigin.me|https://crossorigin.me/{URL}"
    "yacdn|https://yacdn.org/proxy/{URL}"
    "cors.sh|https://cors.sh/{URL}"
    "proxy.cors.sh|https://proxy.cors.sh/{URL}"
    "corsproxy.github.io|https://corsproxy.github.io/?{URL}"
    "api.scraperbox|https://api.scraperbox.com/scrape?api_key=free&url={ENCODED}"
    "jsonp.afeld|https://jsonp.afeld.me/?url={ENCODED}"
    "alloworigin|https://alloworigin.com/get?url={ENCODED}"
    "cors-proxy.htmldriven|https://cors-proxy.htmldriven.com/?url={ENCODED}"
    "gobetween.oklabs|https://gobetween.oklabs.org/{URL}"
    "whateverorigin|https://whateverorigin.org/get?url={ENCODED}"
    "cors-bridged|https://cors-bridged-wnz1.vercel.app/{URL}"
    "nocors.vercel|https://nocors.vercel.app/?url={ENCODED}"
    "cors.zimjs|https://cors.zimjs.com/{URL}"
    "api.websiteproxy|https://api.websiteproxy.co.uk/?url={ENCODED}"
    "cors.io|https://cors.io/{URL}"
    "nordicapis|https://cors.nordicapis.com/{URL}"
    "cors-proxy.fringe|https://cors-proxy.fringe.zone/{URL}"
    "universal-cors|https://universal-cors.vercel.app/api?url={ENCODED}"
    "corsmirror|https://corsmirror.onrender.com/v1/cors?url={ENCODED}"
    "noCORS.deno|https://nocors.deno.dev/{URL}"
    "cors.proxy|https://cors.proxy.consumet.org/{URL}"
    "corsproxy.org|https://www.corsproxy.org/?{URL}"
    "api.webscrapingapi|https://api.webscrapingapi.com/v1?api_key=free&url={ENCODED}"
)

SUCCESS_COUNT=0
FAILED_COUNT=0

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
