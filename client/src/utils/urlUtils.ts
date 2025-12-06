/**
 * Utilitaires pour la gestion des URLs compatibles iOS et web
 */

/**
 * Obtient l'URL de base appropriée selon la plateforme
 */
export function getBaseUrl(): string {
  // Vérifier si nous sommes dans un environnement Capacitor
  const isCapacitor = typeof window !== 'undefined' &&
    (window as any).Capacitor !== undefined;

  // Vérifier si nous sommes en développement local
  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Vérifier si nous sommes dans Capacitor en développement
  const isCapacitorDev = typeof window !== 'undefined' &&
    window.location.href.includes('capacitor://localhost');

  // En développement local (web uniquement), utiliser l'URL locale
  if (isLocalDev && !isCapacitor) {
    return 'http://localhost:3000';
  }

  if (isCapacitor) {
    // En mode natif Capacitor, toujours utiliser l'URL de production Vercel
    return 'https://anisflix.vercel.app';
  } else {
    // En mode web, utiliser l'origine actuelle
    return typeof window !== 'undefined' ? window.location.origin : 'https://anisflix.vercel.app';
  }
}

/**
 * Obtient l'URL complète pour un endpoint API
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${endpoint}`;
}

/**
 * Obtient l'URL du proxy VidMoly
 */
export function getVidMolyProxyUrl(m3u8Url: string, referer?: string): string {
  // Décoder l'URL si elle est sur-encodée, puis la réencoder correctement
  let decodedUrl = m3u8Url;

  // Décoder l'URL jusqu'à ce qu'elle soit correctement décodée
  while (decodedUrl.includes('%25')) {
    decodedUrl = decodeURIComponent(decodedUrl);
    console.log('🔍 getVidMolyProxyUrl - Décodage itératif:', decodedUrl);
  }

  // NE PAS réencoder l'URL - utiliser l'URL décodée directement
  const params = new URLSearchParams({
    url: decodedUrl, // Utiliser l'URL décodée directement
    referer: encodeURIComponent(referer || 'https://vidmoly.net/')
  });

  console.log('🔍 getVidMolyProxyUrl - URL originale:', m3u8Url);
  console.log('🔍 getVidMolyProxyUrl - URL décodée finale:', decodedUrl);
  console.log('🔍 getVidMolyProxyUrl - URL finale (non encodée):', decodedUrl);

  return getApiUrl(`/api/vidmoly?${params.toString()}`);
}

/**
 * Obtient l'URL du proxy Vidzy
 */
export function getVidzyProxyUrl(m3u8Url: string, referer?: string): string {
  const params = new URLSearchParams({
    url: encodeURIComponent(m3u8Url),
    referer: encodeURIComponent(referer || 'https://vidzy.org/')
  });

  return getApiUrl(`/api/vidzy?${params.toString()}`);
}

/**
 * Vérifie si l'URL est une URL Capacitor
 */
export function isCapacitorUrl(url: string): boolean {
  return url.startsWith('capacitor://');
}

/**
 * Convertit une URL Capacitor en URL web si nécessaire
 */
export function convertCapacitorUrl(url: string): string {
  if (isCapacitorUrl(url)) {
    // Remplacer capacitor://localhost par l'URL appropriée selon l'environnement
    const baseUrl = getBaseUrl();
    return url.replace('capacitor://localhost', baseUrl);
  }
  return url;
}

/**
 * Debug: Affiche les informations d'URL pour diagnostic
 */
export function debugUrlInfo(): void {
  console.log('🔍 Debug URL Info:');
  const isCapacitor = typeof window !== 'undefined' &&
    (window as any).Capacitor !== undefined;

  console.log('  - Is Capacitor:', isCapacitor);
  console.log('  - Base URL:', getBaseUrl());

  if (typeof window !== 'undefined') {
    console.log('  - Window origin:', window.location.origin);
    console.log('  - Window href:', window.location.href);
    console.log('  - Is Capacitor URL:', isCapacitorUrl(window.location.href));
  }
}
