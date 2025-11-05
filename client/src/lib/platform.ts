/**
 * Utilitaires pour détecter la plateforme (native vs web)
 */

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Vérifier si on est dans une app Capacitor native
  const hasCapacitor = (window as any).Capacitor !== undefined;
  const hasCapacitorPlugins = (window as any).Capacitor?.Plugins !== undefined;
  
  // Si on a Capacitor ET ses plugins
  if (hasCapacitor && hasCapacitorPlugins) {
    // Vérifier la plateforme Capacitor AVANT de vérifier le protocol
    // C'est la source de vérité la plus fiable
    const capacitorPlatform = (window as any).Capacitor?.getPlatform?.();
    
    // Si Capacitor dit qu'on est sur 'ios' ou 'android', on est NATIF
    // Même si on charge depuis un serveur de développement (http://)
    if (capacitorPlatform === 'ios' || capacitorPlatform === 'android') {
      console.log('✅ [platform.ts] Détection native via Capacitor platform:', capacitorPlatform);
      return true;
    }
    
    // Si Capacitor dit qu'on est sur 'web', ce n'est PAS natif
    if (capacitorPlatform === 'web') {
      console.log('⚠️ [platform.ts] Capacitor platform = web, donc pas natif');
      return false;
    }
    
    // IMPORTANT: Vérifier que ce n'est PAS un navigateur web
    // Sur web, le protocol est http: ou https: ET on n'a pas de plateforme Capacitor native
    const isWebProtocol = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    
    // Si on est sur un navigateur web (même avec Capacitor en mode dev), ce n'est PAS natif
    // MAIS seulement si Capacitor n'a pas déjà déterminé qu'on est sur ios/android
    if (isWebProtocol && capacitorPlatform !== 'ios' && capacitorPlatform !== 'android') {
      console.log('⚠️ [platform.ts] Protocol web ET pas de plateforme native Capacitor');
      return false;
    }
    
    // Si on arrive ici, on est vraiment sur natif (ios/android)
    console.log('✅ [platform.ts] Détection native confirmée');
    return true;
  }
  
  console.log('⚠️ [platform.ts] Pas de Capacitor détecté');
  return false;
}

export function isWebApp(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Sur web, protocol est http: ou https:
  const isWeb = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  
  // Si on n'est pas natif et qu'on est sur web, c'est web
  return !isNativeApp() && isWeb;
}

