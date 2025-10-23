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
  
  if (isCapacitor) {
    // En mode natif, utiliser l'URL de production Vercel
    return 'https://anisflix.vercel.app';
  } else {
    // En mode web, utiliser l'origine actuelle
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
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
  // Vérifier si l'URL est déjà encodée pour éviter le double encodage
  const isAlreadyEncoded = m3u8Url.includes('%');
  const encodedUrl = isAlreadyEncoded ? m3u8Url : encodeURIComponent(m3u8Url);
  
  const params = new URLSearchParams({
    url: encodedUrl,
    referer: encodeURIComponent(referer || 'https://vidmoly.net/')
  });
  
  console.log('🔍 getVidMolyProxyUrl - URL originale:', m3u8Url);
  console.log('🔍 getVidMolyProxyUrl - URL déjà encodée?', isAlreadyEncoded);
  console.log('🔍 getVidMolyProxyUrl - URL finale:', encodedUrl);
  
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
  
  return getApiUrl(`/api/vidzy-proxy?${params.toString()}`);
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
    // Remplacer capacitor://localhost par l'URL Vercel
    return url.replace('capacitor://localhost', 'https://anisflix.vercel.app');
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
