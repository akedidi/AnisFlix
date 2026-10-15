#!/usr/bin/env python3
"""
Standalone probe: MovieBox "Animals" VO as iOS-native would fetch/play.

iOS MovieDetailView rules (detector / no Cookie):
  - hosted API returns worker URL → play source.url (workers.dev moviebox-cdn)
  - native detector → play directUrl bare (no UA/Referer/Cookie)

This script checks:
  1) API match + stream list for recent Animals (tmdb 1236045)
  2) VO 1080p playback via worker (iOS hosted path)
  3) VO 1080p playback via direct CDN bare / with UA (iOS player variants)
  4) Byte-range seeking (AVPlayer scrub)
  5) Whether multiple Animals years collapse to the same CDN asset (bad match)
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://anisflix.vercel.app/api/movix-proxy"
TMDB_KEY = "d131017ccc6e5462a81c9304d21476de"
ANIMALS_IDS = [
    (1236045, "Animals (2026)"),
    (513340, "Animals (2019)"),
    (25713, "Animals (2008)"),
]


def http_get(url: str, headers: dict | None = None, timeout: int = 60):
    req = urllib.request.Request(
        url,
        headers=headers
        or {
            "User-Agent": "AnisFlix-iOS-Test/1.0",
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, dict(resp.headers), resp.read()


def probe(url: str, headers: dict | None, label: str, ranges: list[str] | None = None) -> dict:
    ranges = ranges or ["bytes=0-65535", "bytes=5000000-5004095", "bytes=50000000-50004095"]
    results = []
    for range_h in ranges:
        h = {"Accept": "*/*", "Range": range_h}
        if headers:
            h.update(headers)
        else:
            # Truly bare — no User-Agent (iOS detector path)
            pass
        req = urllib.request.Request(url, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                chunk = resp.read(64)
                cr = resp.headers.get("Content-Range") or ""
                size = -1
                if "/" in cr:
                    try:
                        size = int(cr.split("/")[-1])
                    except ValueError:
                        pass
                ok = resp.status in (200, 206) and (b"ftyp" in chunk or chunk[:1] != b"{")
                results.append(
                    {
                        "range": range_h,
                        "status": resp.status,
                        "ok": ok,
                        "ctype": resp.headers.get("Content-Type"),
                        "content_range": cr,
                        "accept_ranges": resp.headers.get("Accept-Ranges"),
                        "size": size,
                        "ftyp": b"ftyp" in chunk,
                        "head": chunk[:24],
                    }
                )
        except urllib.error.HTTPError as e:
            body = b""
            try:
                body = e.read(120)
            except Exception:
                pass
            results.append(
                {
                    "range": range_h,
                    "status": e.code,
                    "ok": False,
                    "error": body.decode("utf-8", "replace")[:100],
                }
            )
        except Exception as e:
            results.append({"range": range_h, "ok": False, "error": str(e)[:160]})
    all_ok = all(r.get("ok") for r in results)
    print(f"\n[{ 'OK' if all_ok else 'FAIL' }] {label}")
    for r in results:
        if r.get("ok"):
            size_mb = (r.get("size") or 0) / 1e6
            print(
                f"  {r['range']}: {r['status']} {r.get('ctype')} "
                f"size={size_mb:.1f}MB ftyp={r.get('ftyp')} cr={r.get('content_range')}"
            )
        else:
            print(f"  {r['range']}: FAIL {r.get('status')} {r.get('error')}")
    return {"ok": all_ok, "results": results}


def fetch_moviebox(tmdb_id: int) -> dict:
    url = f"{API}?path=moviebox&tmdbId={tmdb_id}&type=movie"
    _, headers, raw = http_get(url, timeout=90)
    data = json.loads(raw)
    data["_api_rev"] = headers.get("X-Anisflix-Api-Rev") or headers.get("x-anisflix-api-rev")
    return data


def tmdb_title(tmdb_id: int) -> dict:
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_KEY}"
    _, _, raw = http_get(url)
    return json.loads(raw)


def main() -> int:
    print("=== MovieBox iOS probe: Animals VO ===\n")
    asset_ids = {}
    worst = 0

    for tmdb_id, label in ANIMALS_IDS:
        meta = tmdb_title(tmdb_id)
        data = fetch_moviebox(tmdb_id)
        streams = data.get("streams") or []
        vo = [s for s in streams if (s.get("language") or "").upper() == "VO"]
        print(f"—— {label} tmdb={tmdb_id} ——")
        print(
            f"  TMDB: {meta.get('title')} ({meta.get('release_date')}) "
            f"runtime={meta.get('runtime')} orig={meta.get('original_language')}"
        )
        print(f"  API streams={len(streams)} VO={len(vo)} matched={data.get('matchedContent')}")

        for s in vo:
            direct = s.get("directUrl") or ""
            path = urllib.parse.urlparse(direct).path
            asset_ids.setdefault(path, []).append(f"{label}/{s.get('quality')}")
            print(
                f"  VO {s.get('quality')} codec={s.get('codec')} "
                f"bare={'bare=1' in (s.get('url') or '')} asset={path.split('/')[-1][:40]}"
            )

        if not vo:
            print("  FAIL: no VO streams")
            worst = 1
            continue

        # Prefer 1080p VO h264 like a normal user tap
        preferred = next(
            (s for s in vo if s.get("quality") == "1080p"),
            vo[0],
        )
        worker = preferred.get("url") or ""
        direct = preferred.get("directUrl") or ""
        print(f"  Playing candidate: {preferred.get('quality')} {preferred.get('codec')}")

        # 1) iOS hosted path: worker URL, Exo/AVPlayer typically sends a UA
        r1 = probe(
            worker,
            {"User-Agent": "AnisFlix/1.0.104 (iPhone; iOS 18.0)"},
            "iOS hosted → worker URL (+ UA)",
        )
        # 2) iOS detector bare direct (CustomVideoPlayer empty headers)
        r2 = probe(direct, None, "iOS detector → direct CDN bare (no UA)")
        # 3) Broken path: direct + Safari UA (what AVURLAsset did before bare fix)
        r3 = probe(
            direct,
            {
                "User-Agent": (
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
                    "Mobile/15E148 Safari/604.1"
                )
            },
            "REGRESSION: direct CDN + Safari UA",
        )
        # 4) Broken path: direct + MovieBox Referer (signed-stream style)
        r4 = probe(
            direct,
            {
                "User-Agent": "com.community.mbox.in/50020130",
                "Referer": "https://moviebox.ph/",
                "Origin": "https://moviebox.ph",
            },
            "REGRESSION: direct CDN + MovieBox Referer/UA",
        )

        # 5) Simulate old iOS bug: HEVC /h265/ forced VLC which always sent Safari UA
        hevc = next((s for s in vo if "/h265/" in (s.get("directUrl") or "")), None)
        if hevc:
            hevc_direct = hevc.get("directUrl") or ""
            hevc_worker = hevc.get("url") or ""
            r5 = probe(
                hevc_direct,
                {
                    "User-Agent": (
                        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                        "AppleWebKit/605.1.15"
                    )
                },
                f"REGRESSION VLC-on-/h265/: direct {hevc.get('quality')} + Safari UA",
            )
            r6 = probe(
                hevc_worker,
                {"User-Agent": "AnisFlix/1.0.104 (iPhone; iOS 18.0)"},
                f"FIXED path: worker {hevc.get('quality')} HEVC (+ UA, AVPlayer)",
            )
            if not r5["ok"] and r6["ok"]:
                print("  ⇒ root cause confirmed: /h265/ + VLC UA = 428; worker+AVPlayer OK")
            elif not r5["ok"] and not r6["ok"]:
                print("  ⇒ HEVC also broken on worker — investigate codecs")
                worst = max(worst, 1)

        if not r1["ok"] and not r2["ok"]:
            print("  ⇒ CRITICAL: neither worker nor bare direct works for AVPlayer")
            worst = 2
        elif not r1["ok"] and r2["ok"]:
            print("  ⇒ iOS should prefer DIRECT bare (worker broken for this title)")
            worst = max(worst, 1)
        elif r1["ok"] and not r2["ok"]:
            print("  ⇒ iOS should prefer WORKER (direct CDN blocked)")
            worst = max(worst, 1)
        else:
            print("  ⇒ both worker and bare direct OK for start+seek")

        if r3["ok"] or r4["ok"]:
            print("  note: CDN currently tolerates some headers; still prefer bare/worker")

    print("\n=== Cross-title asset collision check ===")
    collisions = {k: v for k, v in asset_ids.items() if len(set(x.split("/")[0] for x in v)) > 1}
    if collisions:
        print("FAIL: same CDN asset used for different Animals years (bad MovieBox match):")
        for path, labels in collisions.items():
            print(f"  {path}")
            for lab in labels:
                print(f"    - {lab}")
        worst = max(worst, 1)
    else:
        print("OK: no cross-year asset collision on VO paths sampled")

    print("\n=== VERDICT ===")
    if worst == 0:
        print("OK — Animals VO should play on iOS via worker (hosted) or bare direct")
    elif worst == 1:
        print("PARTIAL — playback possible but matching and/or URL choice need a fix")
    else:
        print("FAIL — Animals VO not playable with current iOS strategies")
    return worst


if __name__ == "__main__":
    sys.exit(main())
