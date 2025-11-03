import { useEffect, useState, useRef } from 'react';

interface DeepOriginDiagnosticProps {
  enabled?: boolean;
}

export default function DeepOriginDiagnostic({ enabled = true }: DeepOriginDiagnosticProps) {
  const [heightInfo, setHeightInfo] = useState({
    innerHeight: 0,
    visualViewportHeight: 0,
    screenHeight: 0,
  });

  const [originInfo, setOriginInfo] = useState<Array<{
    timestamp: string;
    trigger: string;
    details: string;
    innerHeight: number;
  }>>([]);

  const lastHeightRef = useRef(0);
  const originCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const updateHeightInfo = () => {
      const newInfo = {
        innerHeight: window.innerHeight,
        visualViewportHeight: (window as any).visualViewport?.height || window.innerHeight,
        screenHeight: window.screen.height,
      };

      setHeightInfo(prevInfo => {
        // Détecter les changements de innerHeight
        if (prevInfo.innerHeight !== newInfo.innerHeight) {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            trigger: 'unknown',
            details: `innerHeight: ${prevInfo.innerHeight} → ${newInfo.innerHeight}`,
            innerHeight: newInfo.innerHeight,
          };
          
          setOriginInfo(prev => [change, ...prev.slice(0, 9)]);
          console.log('🎯 [DEEP ORIGIN] Changement détecté:', change);
          
          // Si c'est le changement spécifique 778 → 812
          if (prevInfo.innerHeight === 778 && newInfo.innerHeight === 812) {
            console.log('🎯 [DEEP ORIGIN] CHANGEMENT CIBLE: 778 → 812');
            
            // Analyser l'état du DOM
            const bodyStyle = getComputedStyle(document.body);
            const htmlStyle = getComputedStyle(document.documentElement);
            
            console.log('📏 [DEEP ORIGIN] État du DOM:');
            console.log('📏 [DEEP ORIGIN] body.style:', document.body.style.cssText);
            console.log('📏 [DEEP ORIGIN] html.style:', document.documentElement.style.cssText);
            console.log('📏 [DEEP ORIGIN] body.height:', bodyStyle.height);
            console.log('📏 [DEEP ORIGIN] html.height:', htmlStyle.height);
            
            // Vérifier les éléments avec des hauteurs importantes
            const elementsWithHeight = document.querySelectorAll('[style*="height"], [class*="h-"]');
            console.log('📏 [DEEP ORIGIN] Éléments avec hauteur:', elementsWithHeight.length);
            
            // Chercher les éléments récemment ajoutés
            const recentElements = document.querySelectorAll('[data-new], .fade-in-up, .page-enter');
            console.log('📏 [DEEP ORIGIN] Éléments récents:', recentElements.length);
          }
        }

        return newInfo;
      });
    };

    // Surveiller les événements système
    const systemEvents = ['resize', 'orientationchange', 'load', 'DOMContentLoaded', 'focus', 'blur'];
    
    const eventHandlers = systemEvents.map(event => {
      const handler = () => {
        const eventInfo = {
          timestamp: new Date().toLocaleTimeString(),
          trigger: event,
          details: `Événement système: ${event}`,
          innerHeight: window.innerHeight,
        };
        
        setOriginInfo(prev => [eventInfo, ...prev.slice(0, 9)]);
        console.log('📡 [DEEP ORIGIN] Événement système:', eventInfo);
        
        setTimeout(updateHeightInfo, 10);
      };
      
      window.addEventListener(event, handler);
      return { event, handler };
    });

    // Surveiller les modifications du DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          
          const domInfo = {
            timestamp: new Date().toLocaleTimeString(),
            trigger: 'DOM_MODIFICATION',
            details: `${mutation.target.tagName} ${mutation.attributeName} modifié`,
            innerHeight: window.innerHeight,
          };
          
          setOriginInfo(prev => [domInfo, ...prev.slice(0, 9)]);
          console.log('🔧 [DEEP ORIGIN] Modification DOM:', domInfo);
          
          setTimeout(updateHeightInfo, 10);
        }
      });
    });

    // Mise à jour initiale
    updateHeightInfo();

    // Surveiller les changements périodiques
    const interval = setInterval(updateHeightInfo, 1000);

    // Démarrer l'observation du DOM
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['style', 'class'],
      attributeOldValue: true
    });

    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['style', 'class'],
      attributeOldValue: true
    });

    return () => {
      eventHandlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
      clearInterval(interval);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-[999999] max-w-sm text-xs font-mono max-h-96 overflow-y-auto">
      <div className="mb-2 font-bold text-red-400">🔍 Deep Origin Diagnostic</div>
      
      <div className="space-y-1">
        <div>innerHeight: <span className="text-yellow-300">{heightInfo.innerHeight}px</span></div>
        <div>visualViewport: <span className="text-blue-300">{heightInfo.visualViewportHeight}px</span></div>
        <div>screen.height: <span className="text-purple-300">{heightInfo.screenHeight}px</span></div>
      </div>

      {originInfo.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-red-400 mb-1">🎯 Origines détectées:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {originInfo.map((info, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{info.timestamp}</span>
                <br />
                <span className="text-red-300">{info.trigger}:</span> {info.details}
                <br />
                <span className="text-yellow-300">innerHeight: {info.innerHeight}px</span>
                {info.innerHeight === 812 && (
                  <div className="text-yellow-300 font-bold">🎯 CHANGEMENT CIBLE!</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
