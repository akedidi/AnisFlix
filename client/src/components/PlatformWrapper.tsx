import { useEffect } from 'react';
import { usePlatformDetection } from '@/hooks/usePlatformDetection';

/**
 * Composant qui ajoute l'attribut data-platform au document
 * pour permettre le ciblage CSS spécifique par plateforme
 */
export default function PlatformWrapper({ children }: { children: React.ReactNode }) {
  const platform = usePlatformDetection();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // LOGS DE DEBUG
    console.log('🔍 [PlatformWrapper] Platform Detection:', {
      platform: platform.platform,
      isWebDesktop: platform.isWebDesktop,
      isWebMobile: platform.isWebMobile,
      isNativeMobile: platform.isNativeMobile,
      windowWidth: platform.windowWidth
    });

    // Ajouter l'attribut data-platform au documentElement (html)
    document.documentElement.setAttribute('data-platform', platform.platform);
    document.body.setAttribute('data-platform', platform.platform);

    // Vérifier que l'attribut est bien défini
    const htmlPlatform = document.documentElement.getAttribute('data-platform');
    const bodyPlatform = document.body.getAttribute('data-platform');
    console.log('📊 [PlatformWrapper] Attributs data-platform définis:', {
      html: htmlPlatform,
      body: bodyPlatform,
      matches: htmlPlatform === platform.platform && bodyPlatform === platform.platform
    });

    // Classes supplémentaires pour faciliter le ciblage
    document.documentElement.classList.add(`platform-${platform.platform}`);
    if (platform.isWebDesktop) {
      document.documentElement.classList.add('platform-web', 'platform-desktop');
      
      // Sur web-desktop, forcer html et body à avoir la bonne hauteur pour permettre le scroll complet
      const html = document.documentElement;
      const body = document.body;
      
      html.style.setProperty('height', 'auto', 'important');
      html.style.setProperty('min-height', '100vh', 'important');
      html.style.setProperty('max-height', 'none', 'important');
      
      body.style.setProperty('height', 'auto', 'important');
      body.style.setProperty('min-height', '100vh', 'important');
      body.style.setProperty('max-height', 'none', 'important');
    } else if (platform.isWebMobile) {
      document.documentElement.classList.add('platform-web', 'platform-mobile');
    } else if (platform.isNativeMobile) {
      document.documentElement.classList.add('platform-native', 'platform-mobile');
    }

    // Cleanup
    return () => {
      document.documentElement.removeAttribute('data-platform');
      document.body.removeAttribute('data-platform');
      document.documentElement.classList.remove(
        `platform-${platform.platform}`,
        'platform-web',
        'platform-desktop',
        'platform-mobile',
        'platform-native'
      );
    };
  }, [platform.platform, platform.isWebDesktop, platform.isWebMobile, platform.isNativeMobile]);

  return <>{children}</>;
}
