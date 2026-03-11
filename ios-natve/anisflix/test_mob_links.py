#!/usr/bin/env python3
"""
Standalone test script for MOB and MovieBox stream links.
Fetches fresh links via the APIs and tests if they are accessible.

Usage:
    python3 test_mob_links.py [tmdb_id]
    
Default TMDB ID: 1265609 (War Machine)
"""

import sys
import json
import time
import hashlib
import hmac
import base64
import urllib.request
import urllib.parse
import urllib.error

# ============================================================
# CONFIG
# ============================================================
TMDB_API_KEY = "d131017ccc6e5462a81c9304d21476de"
MOB_API_BASE = "https://api.inmoviebox.com"
MOVIEBOX_API = "https://anisflix.vercel.app/api/movix-proxy"

KEY_B64_DEFAULT = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw=="
KEY_B64_ALT = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ=="

MOB_HEADERS_BASE = {
    "User-Agent": "com.community.mbox.in/50020042 (Linux; U; Android 16; en_IN; sdk_gphone64_x86_64; Build/BP22.250325.006; Cronet/133.0.6876.3)",
    "Connection": "keep-alive",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "x-client-info": '{"package_name":"com.community.mbox.in","version_name":"3.0.03.0529.03","version_code":50020042,"os":"android","os_version":"16","device_id":"da2b99c821e6ea023e4be55b54d5f7d8","install_store":"ps","gaid":"d7578036d13336cc","brand":"google","model":"sdk_gphone64_x86_64","system_language":"en","net":"NETWORK_WIFI","region":"IN","timezone":"Asia/Calcutta","sp_code":""}',
    "x-client-status": "0"
}


def decode_key(b64_key):
    step1 = base64.b64decode(b64_key).decode("utf-8")
    return base64.b64decode(step1)


SECRET_KEY_DEFAULT = decode_key(KEY_B64_DEFAULT)
SECRET_KEY_ALT = decode_key(KEY_B64_ALT)


# ============================================================
# MOB CRYPTO
# ============================================================
def md5_hex(s):
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def hmac_md5_b64(key, data):
    sig = hmac.new(key, data.encode("utf-8"), hashlib.md5).digest()
    return base64.b64encode(sig).decode("utf-8")


def generate_x_client_token(timestamp):
    ts = str(timestamp)
    reversed_ts = ts[::-1]
    h = md5_hex(reversed_ts)
    return f"{ts},{h}"


def build_canonical_string(method, accept, content_type, url, body, timestamp):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    query = ""
    if parsed.query:
        params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        sorted_params = sorted(params.items())
        query = "&".join(f"{k}={v[0]}" for k, v in sorted_params)

    canonical_url = f"{path}?{query}" if query else path
    body_hash = ""
    body_length = ""
    if body:
        body_bytes = body.encode("utf-8")
        body_length = str(len(body_bytes))
        body_hash = hashlib.md5(body_bytes).hexdigest()

    return f"{method.upper()}\n{accept or ''}\n{content_type or ''}\n{body_length}\n{timestamp}\n{body_hash}\n{canonical_url}"


def generate_x_tr_signature(method, accept, content_type, url, body, use_alt_key=False, timestamp=None):
    canonical = build_canonical_string(method, accept, content_type, url, body, timestamp)
    secret = SECRET_KEY_ALT if use_alt_key else SECRET_KEY_DEFAULT
    sig = hmac_md5_b64(secret, canonical)
    return f"{timestamp}|2|{sig}"


def mob_request(method, url, body=None, use_alt_key=False):
    timestamp = int(time.time() * 1000)
    x_client_token = generate_x_client_token(timestamp)
    accept = "application/json"
    content_type = "application/json"
    x_tr_sig = generate_x_tr_signature(method, accept, content_type, url, body, use_alt_key, timestamp)

    headers = dict(MOB_HEADERS_BASE)
    headers["Accept"] = accept
    headers["Content-Type"] = content_type
    headers["x-client-token"] = x_client_token
    headers["x-tr-signature"] = x_tr_sig

    data = body.encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method.upper())

    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ============================================================
# TMDB
# ============================================================
def fetch_tmdb_info(tmdb_id, media_type="movie"):
    url = f"https://api.themoviedb.org/3/{media_type}/{tmdb_id}?api_key={TMDB_API_KEY}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    title = data.get("title") or data.get("name") or ""
    original_title = data.get("original_title") or data.get("original_name") or title
    date_str = data.get("release_date") or data.get("first_air_date") or ""
    year = date_str[:4]
    return title, original_title, year


# ============================================================
# MOB SCRAPER
# ============================================================
def mob_search(query):
    url = f"{MOB_API_BASE}/wefeed-mobile-bff/subject-api/search/v2"
    body = json.dumps({"page": 1, "perPage": 10, "keyword": query})
    resp = mob_request("POST", url, body=body)
    subjects = []
    if "data" in resp and "results" in resp["data"]:
        for group in resp["data"]["results"]:
            if "subjects" in group:
                subjects.extend(group["subjects"])
    return subjects


def mob_find_best_match(results, target_title, target_year, is_movie=True):
    target_norm = target_title.lower().strip()
    target_type = 1 if is_movie else 2
    best_id, best_title, best_score = None, None, 0

    for item in results:
        if item.get("subjectType") != target_type:
            continue
        title = item.get("title", "")
        subject_id = str(item.get("subjectId", ""))
        norm = title.lower().strip()
        year = str(item.get("year", ""))

        score = 0
        if norm == target_norm:
            score += 50
        elif target_norm in norm or norm in target_norm:
            score += 15
        if target_year and year and target_year == year:
            score += 35
        if score > best_score:
            best_score = score
            best_id = subject_id
            best_title = title

    if best_score >= 40 and best_id:
        return best_id, best_title
    return None, None


def mob_get_streams(subject_id, season=0, episode=0):
    """Get streams for a single subject ID"""
    play_url = f"{MOB_API_BASE}/wefeed-mobile-bff/subject-api/play-info?subjectId={subject_id}&se={season}&ep={episode}"
    resp = mob_request("GET", play_url)
    streams = []
    if "data" in resp and "streams" in resp["data"]:
        for s in resp["data"]["streams"]:
            url = s.get("url", "")
            quality = s.get("resolutions") or s.get("quality") or "720p"
            cookie = s.get("signCookie", "")
            stream_type = "dash" if ".mpd" in url else ("hls" if ".m3u8" in url else "mp4")
            streams.append({
                "url": url,
                "quality": quality,
                "type": stream_type,
                "cookie": cookie
            })
    return streams


def fetch_mob_sources(tmdb_id):
    print(f"\n{'='*60}")
    print(f"🔍 [MOB] Fetching sources for TMDB ID: {tmdb_id}")
    print(f"{'='*60}")

    title, original_title, year = fetch_tmdb_info(tmdb_id)
    print(f"📽️  Title: {title} | Original: {original_title} | Year: {year}")

    results = mob_search(title)
    print(f"🔎 Search returned {len(results)} results")

    subject_id, matched_title = mob_find_best_match(results, title, year)
    if not subject_id and original_title != title:
        print(f"🔄 Retrying with original title: {original_title}")
        results = mob_search(original_title)
        subject_id, matched_title = mob_find_best_match(results, original_title, year)

    if not subject_id:
        print("❌ No match found!")
        return []

    print(f"✅ Matched: {matched_title} (ID: {subject_id})")

    streams = mob_get_streams(subject_id)
    print(f"🎬 Got {len(streams)} stream(s)")
    return streams


# ============================================================
# MOVIEBOX SCRAPER
# ============================================================
def fetch_moviebox_sources(tmdb_id):
    print(f"\n{'='*60}")
    print(f"🔍 [MovieBox] Fetching sources for TMDB ID: {tmdb_id}")
    print(f"{'='*60}")

    url = f"{MOVIEBOX_API}?path=moviebox&tmdbId={tmdb_id}&type=movie"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"❌ MovieBox API error: {e}")
        return []

    streams = []
    if "streams" in data:
        for s in data["streams"]:
            streams.append({
                "url": s.get("url", ""),
                "directUrl": s.get("directUrl"),
                "quality": s.get("quality", "HD"),
                "type": s.get("type", "mp4"),
                "headers": s.get("headers", {})
            })
    print(f"🎬 Got {len(streams)} MovieBox stream(s)")
    return streams


# ============================================================
# LINK TESTER
# ============================================================
def test_link(url, headers=None, label=""):
    """Test if a URL is accessible with given headers"""
    print(f"\n  🧪 Testing: {label}")
    print(f"     URL: {url[:100]}{'...' if len(url) > 100 else ''}")

    req_headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
    }
    if headers:
        req_headers.update(headers)
        print(f"     Headers: {list(headers.keys())}")

    req = urllib.request.Request(url, headers=req_headers)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            content_type = resp.headers.get("Content-Type", "unknown")
            content_length = resp.headers.get("Content-Length", "unknown")
            # Read first 1KB to verify content
            first_bytes = resp.read(1024)
            print(f"     ✅ HTTP {status} | Type: {content_type} | Size: {content_length} | First bytes: {len(first_bytes)}")
            return True
    except urllib.error.HTTPError as e:
        print(f"     ❌ HTTP {e.code} | {e.reason}")
        body = e.read(500).decode("utf-8", errors="replace")
        print(f"     Body: {body[:200]}")
        return False
    except Exception as e:
        print(f"     ❌ Error: {e}")
        return False


# ============================================================
# MAIN
# ============================================================
def main():
    tmdb_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1265609  # War Machine default

    title, _, _ = fetch_tmdb_info(tmdb_id)
    print(f"\n🎬 Testing streams for: {title} (TMDB: {tmdb_id})")

    # ---- MOB ----
    mob_streams = fetch_mob_sources(tmdb_id)
    print(f"\n{'='*60}")
    print(f"📊 MOB LINK TESTS")
    print(f"{'='*60}")
    for i, s in enumerate(mob_streams):
        headers = {
            "Referer": MOB_API_BASE,
            "User-Agent": MOB_HEADERS_BASE["User-Agent"]
        }
        if s.get("cookie"):
            headers["Cookie"] = s["cookie"]

        test_link(s["url"], headers=headers, label=f"MOB #{i+1} ({s['quality']}, {s['type']})")

        # Also test WITHOUT headers
        test_link(s["url"], headers=None, label=f"MOB #{i+1} SANS HEADERS ({s['quality']}, {s['type']})")

    # ---- MOVIEBOX ----
    mb_streams = fetch_moviebox_sources(tmdb_id)
    print(f"\n{'='*60}")
    print(f"📊 MOVIEBOX LINK TESTS")
    print(f"{'='*60}")
    for i, s in enumerate(mb_streams):
        url = s.get("directUrl") or s["url"]
        h = s.get("headers", {})
        test_link(url, headers=h, label=f"MovieBox #{i+1} ({s['quality']}, {s['type']})")
        test_link(url, headers=None, label=f"MovieBox #{i+1} SANS HEADERS ({s['quality']}, {s['type']})")

    # ---- SUMMARY ----
    print(f"\n{'='*60}")
    print(f"📋 RÉSUMÉ")
    print(f"{'='*60}")
    print(f"  MOB streams trouvés: {len(mob_streams)}")
    for s in mob_streams:
        print(f"    - {s['quality']} | {s['type']} | {s['url'][:80]}...")
    print(f"  MovieBox streams trouvés: {len(mb_streams)}")
    for s in mb_streams:
        u = s.get('directUrl') or s['url']
        print(f"    - {s['quality']} | {s['type']} | {u[:80]}...")


if __name__ == "__main__":
    main()
