import CryptoJS from 'crypto-js';
import {
  API_BASE,
  BRAND_MODELS,
  KEY_B64_ALT,
  KEY_B64_DEFAULT,
  PACKAGE_INFO,
  PROXY_URL,
  TMDB_API_KEY,
  TMDB_BASE_URL,
} from './constants.js';

const SECRET_KEY_DEFAULT = CryptoJS.enc.Base64.parse(
  CryptoJS.enc.Base64.parse(KEY_B64_DEFAULT).toString(CryptoJS.enc.Utf8)
);
const SECRET_KEY_ALT = CryptoJS.enc.Base64.parse(
  CryptoJS.enc.Base64.parse(KEY_B64_ALT).toString(CryptoJS.enc.Utf8)
);

let deviceId = '';
let selectedBrand = '';
let selectedModel = '';

export function initializeSession() {
  if (!deviceId) {
    const chars = '0123456789abcdef';
    for (let i = 0; i < 32; i++) {
      deviceId += chars[Math.floor(Math.random() * 16)];
    }
    const brands = Object.keys(BRAND_MODELS);
    selectedBrand = brands[Math.floor(Math.random() * brands.length)];
    selectedModel = BRAND_MODELS[selectedBrand][Math.floor(Math.random() * BRAND_MODELS[selectedBrand].length)];
  }
}

function md5(input) {
  return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
}

function hmacMd5(key, data) {
  return CryptoJS.HmacMD5(data, key).toString(CryptoJS.enc.Base64);
}

export function generateXClientToken(timestamp) {
  const ts = (timestamp || Date.now()).toString();
  const reversed = ts.split('').reverse().join('');
  return `${ts},${md5(reversed)}`;
}

function buildCanonicalString(method, accept, contentType, url, body, timestamp) {
  let path = '';
  let query = '';

  try {
    const urlObj = new URL(url);
    path = urlObj.pathname;
    const params = Array.from(urlObj.searchParams.keys()).sort();
    if (params.length > 0) {
      query = params
        .map((key) => urlObj.searchParams.getAll(key).map((val) => `${key}=${val}`).join('&'))
        .join('&');
    }
  } catch {
    if (url.includes('?')) {
      const [base, qs] = url.split('?');
      path = base.replace(/https?:\/\/[^/]+/, '');
      query = qs.split('&').sort().join('&');
    } else {
      path = url.replace(/https?:\/\/[^/]+/, '');
    }
  }

  const canonicalUrl = query ? `${path}?${query}` : path;
  let bodyHash = '';
  let bodyLength = '';

  if (body) {
    const bodyWords = CryptoJS.enc.Utf8.parse(body);
    bodyHash = md5(bodyWords);
    bodyLength = bodyWords.sigBytes.toString();
  }

  return `${method.toUpperCase()}\n${accept || ''}\n${contentType || ''}\n${bodyLength}\n${timestamp}\n${bodyHash}\n${canonicalUrl}`;
}

export function generateXTrSignature(method, accept, contentType, url, body, useAltKey = false, customTimestamp = null) {
  const timestamp = customTimestamp || Date.now();
  const canonical = buildCanonicalString(method, accept, contentType, url, body, timestamp);
  const secret = useAltKey ? SECRET_KEY_ALT : SECRET_KEY_DEFAULT;
  return `${timestamp}|2|${hmacMd5(secret, canonical)}`;
}

function buildClientInfo() {
  return JSON.stringify({
    ...PACKAGE_INFO,
    os: 'android',
    os_version: '16',
    device_id: deviceId,
    install_store: 'ps',
    gaid: 'd7578036d13336cc',
    brand: selectedBrand.toLowerCase(),
    model: selectedModel,
    system_language: 'en',
    net: 'NETWORK_WIFI',
    region: 'IN',
    timezone: 'Asia/Calcutta',
    sp_code: '',
  });
}

function buildUserAgent() {
  return `${PACKAGE_INFO.package_name}/${PACKAGE_INFO.version_code} (Linux; U; Android 16; en_IN; ${selectedModel}; Build/BP22.250325.006; Cronet/133.0.6876.3)`;
}

export async function movieBoxRequest(method, url, body = null, customHeaders = {}) {
  initializeSession();

  const timestamp = Date.now();
  const headerContentType =
    customHeaders['Content-Type'] || (body ? 'application/json; charset=utf-8' : 'application/json');
  const accept = customHeaders.Accept || 'application/json';

  const targetHeaders = {
    Accept: accept,
    'Content-Type': headerContentType,
    'x-client-token': generateXClientToken(timestamp),
    'x-tr-signature': generateXTrSignature(method, accept, headerContentType, url, body, false, timestamp),
    'User-Agent': buildUserAgent(),
    'x-client-info': buildClientInfo(),
    'x-client-status': '0',
    ...customHeaders,
  };

  const proxyTarget = `${PROXY_URL}/?path=mob&url=${encodeURIComponent(url)}&method=${method}`;
  let retries = 2;

  while (retries > 0) {
    try {
      const res = await fetch(proxyTarget, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: targetHeaders, body }),
      });

      if (!res.ok) {
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      if (parsed?.error) {
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      return {
        data: parsed,
        headers: { get: (name) => (name.toLowerCase() === 'x-user' ? res.headers.get('x-user') : null) },
      };
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('[MovieBox Request Error]', err.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return null;
}

export async function fetchTmdbDetails(tmdbId, mediaType) {
  try {
    const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: mediaType === 'movie' ? data.title || data.original_title : data.name || data.original_name,
      year: (data.release_date || data.first_air_date || '').substring(0, 4),
      originalTitle: data.original_title || data.original_name,
    };
  } catch (e) {
    console.error('[MovieBox TMDB Error]', e.message);
    return null;
  }
}

export function normalizeTitle(s) {
  if (!s) return '';
  return s
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(dub|dubbed|hd|4k|hindi|tamil|telugu|dual audio)\b/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/:/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function parseQualityNumber(value) {
  const match = String(value || '').match(/(\d{3,4})/);
  return match ? parseInt(match[1], 10) : 0;
}

export function getFormatType(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('.mpd')) return 'DASH';
  if (u.includes('.m3u8')) return 'HLS';
  if (u.includes('.mp4')) return 'MP4';
  return 'VIDEO';
}

export function mapLanguageLabel(lang) {
  const l = String(lang || '').toLowerCase();
  if (l.includes('french') || l.includes('français') || l === 'fr' || l === 'vf') return 'VF';
  if (l.includes('original') || l === 'vo') return 'VO';
  return lang || 'VO';
}
