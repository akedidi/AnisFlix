#!/bin/bash
# Test FOURTH BATCH of CORS proxies against AfterDark API
TARGET="https://afterdark.mom/api/sources/movies?tmdbId=1315702&title=The%20Residence&year=2025&originalTitle=Dalloway"
ENCODED_TARGET=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TARGET', safe=''))")

echo "🧪 Testing CORS proxies (BATCH 4) against AfterDark API..."
echo "Target: $TARGET"
echo ""

# FOURTH batch of CORS proxies - more obscure ones
PROXIES=(
    "proxy.scrapingant|https://api.scrapingant.com/v2/general?url={ENCODED}"
    "cors.proxy.workers|https://cors.proxy.workers.dev/{URL}"
    "api.proxycrawl|https://api.proxycrawl.com/?url={ENCODED}"
    "cors-proxy-cf|https://cors-proxy.cf/{URL}"
    "proxy.crawlbase|https://api.crawlbase.com/?url={ENCODED}"
    "cors-anywhere.azurewebsites|https://cors-anywhere.azurewebsites.net/{URL}"
    "proxy.scrapfly|https://api.scrapfly.io/scrape?url={ENCODED}"
    "cors-proxy.net|https://cors-proxy.net/{URL}"
    "api.webscraping|https://api.webscraping.ai/?url={ENCODED}"
    "cors-anywhere-render|https://cors-anywhere.onrender.com/{URL}"
    "proxy.scrape-it|https://api.scrape-it.cloud/?url={ENCODED}"
    "cors-proxy.nl|https://cors-proxy.nl/{URL}"
    "api.scrapedo|https://api.scrapedo.com/?url={ENCODED}"
    "cors-anywhere-fly|https://cors-anywhere.fly.dev/{URL}"
    "proxy.apilayer|https://api.apilayer.com/scrape?url={ENCODED}"
    "cors-proxy.eu|https://cors-proxy.eu/{URL}"
    "api.fetchproxy|https://api.fetchproxy.com/?url={ENCODED}"
    "cors-anywhere-railway|https://cors-anywhere.up.railway.app/{URL}"
    "proxy.scrapeapi|https://api.scrapeapi.io/?url={ENCODED}"
    "cors-proxy.de|https://cors-proxy.de/{URL}"
    "api.datadome|https://api.datadome.co/?url={ENCODED}"
    "cors-anywhere-cyclic|https://cors-anywhere.cyclic.app/{URL}"
    "proxy.luminati|https://proxy.luminati.io/?url={ENCODED}"
    "cors-proxy.es|https://cors-proxy.es/{URL}"
    "api.proxyrack|https://api.proxyrack.com/?url={ENCODED}"
    "cors-anywhere-deno|https://cors-anywhere.deno.dev/{URL}"
    "proxy.ipburger|https://api.ipburger.com/?url={ENCODED}"
    "cors-proxy.fr|https://cors-proxy.fr/{URL}"
    "api.stormproxies|https://api.stormproxies.com/?url={ENCODED}"
    "cors-anywhere-vercel2|https://cors-anywhere-2.vercel.app/{URL}"
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
