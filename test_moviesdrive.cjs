const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Connection": "keep-alive"
};

async function getMainUrl() {
  // Try directly mdrives.net or similar? Wait, I need the logic from moviesdrive.js
  // Let's hardcode for testing
  return "https://moviesdrive.org"; // It might redirect
}

async function hubCloudExtractor(url, referer) {
  try {
    let finalUrl = url;
    let pageData = "";
    
    // Cloudflare turnstile wait logic from original script
    const initialResponse = await axios.get(url, { headers: { ...HEADERS, Referer: referer }});
    pageData = initialResponse.data;
    
    if (pageData.includes("url =")) {
      await new Promise((r) => setTimeout(r, 6000));
      let nextHref = null;
      const metaRefreshMatch = pageData.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)["']/i);
      if (metaRefreshMatch) {
        nextHref = metaRefreshMatch[1];
      } else {
        const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
        if (scriptUrlMatch) nextHref = scriptUrlMatch[1];
      }
      if (nextHref) {
        if (!nextHref.startsWith("http")) {
          const urlObj = new URL(url);
          nextHref = `${urlObj.protocol}//${urlObj.hostname}/${nextHref.replace(/^\//, "")}`;
        }
        finalUrl = nextHref;
        const secondResponse = await axios.get(finalUrl, { headers: { ...HEADERS, Referer: url } });
        pageData = secondResponse.data;
      }
    }
    
    const $ = cheerio.load(pageData);
    const size = $("i#size").text().trim();
    const header = $("div.card-header").text().trim();
    const qualityMatch = header.match(/(\d{3,4})[pP]/);
    const quality = qualityMatch ? parseInt(qualityMatch[1]) : 1080;
    
    const links = [];
    $("a.btn").each((i, element) => {
      const link = $(element).attr("href");
      const text = $(element).text().toLowerCase();
      
      if (text.includes("download file") || text.includes("fsl server") || text.includes("s3 server") || text.includes("fslv2") || text.includes("mega server") || (link && link.includes("r2.dev"))) {
        let label = "HubCloud";
        if (link && link.includes("r2.dev")) label = "Direct R2";
        else if (link && link.includes("workers.dev")) label = "ZipDisk Server";
        else if (text.includes("fsl server")) label = "HubCloud - FSL";
        else if (text.includes("s3 server")) label = "HubCloud - S3";
        else if (text.includes("fslv2")) label = "HubCloud - FSLv2";
        else if (text.includes("mega server")) label = "HubCloud - Mega";
        
        links.push({ name: label, quality, url: link, size });
      }
    });
    
    return links;
  } catch (e) {
    console.error("[HubCloudExtractor] error:", e.message);
    return [];
  }
}

async function loadExtractor(url, referer) {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("hubcloud")) return await hubCloudExtractor(url, referer);
    if (hostname.includes("gdflix") || hostname.includes("gdlink")) return [{ name: "Google Drive", quality: 1080, url }];
    return [];
  } catch (e) {
    return [];
  }
}

async function extractMdrive(url) {
  try {
    const proxyUrl = `https://anisflix-worker.kedidi-anis.workers.dev/?path=mob&url=${encodeURIComponent(url)}`;
    const res = await axios.get(proxyUrl, { headers: HEADERS });
    const html = res.data;
    
    if (url.includes("search-recover.php")) {
      const qMatch = html.match(/const Q_INITIAL\s*=\s*"([^"]+)"/);
      const tokenMatch = html.match(/const FROM_AC_TOKEN\s*=\s*"([^"]+)"/);
      if (qMatch && tokenMatch) {
        const apiBase = url.split("?")[0];
        const searchParams = new URLSearchParams({
          api: "search",
          q: qMatch[1],
          page: "1",
          from_ac: tokenMatch[1]
        });
        const apiRes = await axios.get(`${apiBase}?${searchParams.toString()}`, {
          headers: { ...HEADERS, "Accept": "application/json" }
        });
        const data = apiRes.data;
        if (data.hits) {
          return data.hits.map(h => h.url).filter(u => !!u);
        }
      }
    }
    
    const $ = cheerio.load(html);
    const regex = /hubcloud|gdflix|gdlink/i;
    const links = [];
    $("a[href]").each((i, el) => {
      const href = $(el).attr("href");
      if (regex.test(href)) {
        links.push(href);
      }
    });
    return links;
  } catch (e) {
    console.error("[extractMdrive] Error:", e.message);
    return [];
  }
}

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  console.log(`[MoviesDrive] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
  const tmdbApiKey = "1865f43a0549ca50d341dd9ab8b29f49";
  const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
  
  try {
    const tmdbRes = await axios.get(tmdbUrl, { headers: { ...HEADERS, "Accept": "application/json" } });
    const tmdbData = tmdbRes.data;
    const imdbId = tmdbData.external_ids?.imdb_id;
    
    if (!imdbId) {
      console.error("[MoviesDrive] Failed to get IMDB ID");
      return [];
    }
    
    const mainUrl = await getMainUrl();
    const searchUrl = `${mainUrl}/search.php?q=${imdbId}`;
    console.log(`[MoviesDrive] Searching at: ${searchUrl}`);
    
    const proxySearchUrl = `https://anisflix-worker.kedidi-anis.workers.dev/?path=mob&url=${encodeURIComponent(searchUrl)}`;
    const searchRes = await axios.get(proxySearchUrl, { headers: HEADERS });
    const searchData = searchRes.data;
    
    if (!searchData.hits || searchData.hits.length === 0) {
      console.log("[MoviesDrive] No hits found");
      return [];
    }
    
    const match = searchData.hits.map(h => h.document).find(d => d.imdb_id === imdbId);
    if (!match) {
      console.log("[MoviesDrive] No exact IMDB match found");
      return [];
    }
    
    const permalink = match.permalink;
    const href = permalink.startsWith("http") ? permalink : `${mainUrl}${permalink}`;
    console.log(`[MoviesDrive] Found movie page: ${href}`);
    
    const proxyHref = `https://anisflix-worker.kedidi-anis.workers.dev/?path=mob&url=${encodeURIComponent(href)}`;
    const pageRes = await axios.get(proxyHref, { headers: HEADERS });
    const pageHtml = pageRes.data;
    const $ = cheerio.load(pageHtml);
    const allLinks = [];
    
    if (mediaType === "movie") {
      const downloadLinks = [];
      $("h5 > a").each((i, el) => {
        downloadLinks.push($(el).attr("href"));
      });
      
      const uniqueLinks = [...new Set(downloadLinks)];
      console.log(`[MoviesDrive] Found download pages:`, uniqueLinks);
      
      for (const dLink of uniqueLinks) {
        const extracted = await extractMdrive(dLink);
        for (const server of extracted) {
          const streams = await loadExtractor(server, href);
          allLinks.push(...streams.map(s => ({
            ...s,
            title: `${tmdbData.title || tmdbData.name} - ${s.name} [${s.quality}p]`,
            provider: "moviesdrive"
          })));
        }
      }
    } else {
      const stag = `Season ${seasonNum}`;
      const sep = `Ep${String(episodeNum).padStart(2, "0")}|Ep${episodeNum}`;
      const seasonRegex = new RegExp(stag, "i");
      const epRegex = new RegExp(sep, "i");
      
      const entries = $("h5").filter((i, el) => seasonRegex.test($(el).text()));
      for (let i = 0; i < entries.length; i++) {
        const entry = entries.eq(i);
        const nextHref = entry.next().find("a").attr("href");
        if (nextHref) {
          const epPageRes = await axios.get(nextHref, { headers: HEADERS });
          const $ep = cheerio.load(epPageRes.data);
          const epEntries = $ep("h5").filter((j, el) => epRegex.test($ep(el).text()));
          
          for (let j = 0; j < epEntries.length; j++) {
            const epEntry = epEntries.eq(j);
            const link1 = epEntry.next().find("a").attr("href");
            const link2 = epEntry.next().next().find("a").attr("href");
            const epLinks = [link1, link2].filter(l => !!l);
            
            for (const epLink of epLinks) {
              const streams = await loadExtractor(epLink, nextHref);
              allLinks.push(...streams.map(s => ({
                ...s,
                title: `${tmdbData.title || tmdbData.name} S${seasonNum}E${episodeNum} - ${s.name} [${s.quality}p]`,
                provider: "moviesdrive"
              })));
            }
          }
        }
      }
    }
    return allLinks;
  } catch (e) {
    console.error("[MoviesDrive] Error:", e.message);
    return [];
  }
}

// Test The Dark Knight (TMDB: 155)
(async () => {
  console.log("=== Testing MoviesDrive ===");
  const streams = await getStreams(155, "movie");
  console.log("Results:", JSON.stringify(streams, null, 2));
})();
