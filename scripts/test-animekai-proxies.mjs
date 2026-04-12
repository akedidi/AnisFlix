const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

async function getRealLinksListUrl() {
  // Use a known working token observed in logs/tests.
  const token = "MN3yt6X550zl02hB0ImG";
  const encRes = await fetch("https://enc-dec.app/api/enc-kai?text=" + encodeURIComponent(token), {
    headers: { "User-Agent": ua },
  });
  const encJson = await encRes.json();
  const enc = encJson?.result;
  if (!enc) throw new Error("Failed to build encrypted token");
  return "https://animekai.to/ajax/links/list?token=" + encodeURIComponent(token) + "&_=" + encodeURIComponent(enc);
}

const proxies = [
  ["corsproxy.io", "https://corsproxy.io/?{URL}"],
  ["cors.eu.org", "https://cors.eu.org/{URL}"],
  ["allorigins", "https://api.allorigins.win/raw?url={ENCODED}"],
  ["codetabs", "https://api.codetabs.com/v1/proxy?quest={ENCODED}"],
  ["thingproxy", "https://thingproxy.freeboard.io/fetch/{URL}"],
  ["cors-anywhere-herokuapp", "https://cors-anywhere.herokuapp.com/{URL}"],
  ["crossorigin.me", "https://crossorigin.me/{URL}"],
  ["yacdn", "https://yacdn.org/proxy/{URL}"],
  ["cors.sh", "https://cors.sh/{URL}"],
  ["proxy.cors.sh", "https://proxy.cors.sh/{URL}"],
  ["corsproxy.github.io", "https://corsproxy.github.io/?{URL}"],
  ["api.scraperbox", "https://api.scraperbox.com/scrape?api_key=free&url={ENCODED}"],
  ["jsonp.afeld", "https://jsonp.afeld.me/?url={ENCODED}"],
  ["alloworigin", "https://alloworigin.com/get?url={ENCODED}"],
  ["cors-proxy.htmldriven", "https://cors-proxy.htmldriven.com/?url={ENCODED}"],
  ["gobetween.oklabs", "https://gobetween.oklabs.org/{URL}"],
  ["whateverorigin", "https://whateverorigin.org/get?url={ENCODED}"],
  ["cors-bridged", "https://cors-bridged-wnz1.vercel.app/{URL}"],
  ["nocors.vercel", "https://nocors.vercel.app/?url={ENCODED}"],
  ["cors.zimjs", "https://cors.zimjs.com/{URL}"],
  ["api.websiteproxy", "https://api.websiteproxy.co.uk/?url={ENCODED}"],
  ["cors.io", "https://cors.io/{URL}"],
  ["nordicapis", "https://cors.nordicapis.com/{URL}"],
  ["cors-proxy.fringe", "https://cors-proxy.fringe.zone/{URL}"],
  ["universal-cors", "https://universal-cors.vercel.app/api?url={ENCODED}"],
  ["corsmirror", "https://corsmirror.onrender.com/v1/cors?url={ENCODED}"],
  ["noCORS.deno", "https://nocors.deno.dev/{URL}"],
  ["cors.proxy", "https://cors.proxy.consumet.org/{URL}"],
  ["corsproxy.org", "https://www.corsproxy.org/?{URL}"],
  ["api.webscrapingapi", "https://api.webscrapingapi.com/v1?api_key=free&url={ENCODED}"],
];

function buildUrl(template) {
  return template.replace("{URL}", target).replace("{ENCODED}", encodeURIComponent(target));
}

function classify(status, body) {
  if (status === 403 || /forbidden|403/i.test(body)) return "403";
  if (status >= 200 && status < 400) {
    // Strict validation: AnimeKai expected payload should include status/result keys
    if (/\"status\"\s*:\s*\"ok\"/i.test(body) && /\"result\"\s*:/i.test(body)) return "ok";
    return "invalid_body";
  }
  if (status === 0) return "error";
  return `http_${status}`;
}

async function testOne(name, template) {
  const url = buildUrl(template);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          ua,
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(10000),
    });
    const txt = await res.text();
    const body = String(txt || "").slice(0, 160);
    return {
      name,
      status: res.status,
      ms: Date.now() - started,
      class: classify(res.status, body),
      preview: body.replace(/\s+/g, " "),
    };
  } catch (e) {
    return {
      name,
      status: 0,
      ms: Date.now() - started,
      class: "error",
      preview: e?.message || String(e),
    };
  }
}

const target = await getRealLinksListUrl();
console.log(`Testing ${proxies.length} proxies against: ${target}`);
const out = [];
for (const [name, template] of proxies) {
  const r = await testOne(name, template);
  out.push(r);
  console.log(`${name.padEnd(24)} ${String(r.status).padStart(4)} ${r.class.padEnd(8)} ${String(r.ms).padStart(5)}ms`);
}

const ok = out.filter((r) => r.class === "ok");
const forbidden = out.filter((r) => r.class === "403");
const other = out.filter((r) => r.class !== "ok" && r.class !== "403");
console.log("\nSummary");
console.log(`ok=${ok.length} forbidden=${forbidden.length} other=${other.length}`);
console.log("\nOK proxies:");
for (const r of ok) console.log(`- ${r.name} (${r.status})`);
