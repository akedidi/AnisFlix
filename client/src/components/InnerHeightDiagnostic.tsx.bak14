import { useState, useEffect } from 'react';

interface InnerHeightDiagnosticProps {
  enabled?: boolean;
}

export default function InnerHeightDiagnostic({ enabled = true }: InnerHeightDiagnosticProps) {
  const [heightInfo, setHeightInfo] = useState({
    innerHeight: 0,
    innerWidth: 0,
    visualViewportHeight: 0,
    screenHeight: 0,
    availHeight: 0,
  });

  const [changes, setChanges] = useState<Array<{
    timestamp: string;
    from: number;
    to: number;
    difference: number;
    trigger: string;
    stack?: string;
  }>>([]);

  const [events, setEvents] = useState<Array<{
    timestamp: string;
    event: string;
    innerHeight: number;
  }>>([]);

  const [tabBarInfo, setTabBarInfo] = useState({
    found: false,
    bottom: 0,
    top: 0,
    height: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const updateHeightInfo = () => {
      const newInfo = {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        visualViewportHeight: (window as any).visualViewport?.height || window.innerHeight,
        screenHeight: window.screen.height,
        availHeight: window.screen.availHeight,
      };

      // Vérifier la position de la tab bar
      const tabBar = document.querySelector('.mobile-bottom-nav');
      if (tabBar) {
        const rect = tabBar.getBoundingClientRect();
        setTabBarInfo({
          found: true,
          bottom: rect.bottom,
          top: rect.top,
          height: rect.height,
        });
      } else {
        setTabBarInfo({
          found: false,
          bottom: 0,
          top: 0,
          height: 0,
        });
      }

      setHeightInfo(prevInfo => {
        // Détecter les changements de innerHeight
        if (prevInfo.innerHeight !== newInfo.innerHeight) {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            from: prevInfo.innerHeight,
            to: newInfo.innerHeight,
            difference: newInfo.innerHeight - prevInfo.innerHeight,
            trigger: 'unknown',
            stack: new Error().stack,
          };
          setChanges(prev => [change, ...prev.slice(0, 9)]);
          console.log('🎯 [INNERHEIGHT DIAGNOSTIC] CHANGEMENT DÉTECTÉ:', change);
          
          // Si c'est le changement spécifique 778 → 812
          if (prevInfo.innerHeight === 778 && newInfo.innerHeight === 812) {
            console.log('🎯 [INNERHEIGHT DIAGNOSTIC] CHANGEMENT CIBLE: 778 → 812');
            console.log('🎯 [INNERHEIGHT DIAGNOSTIC] Stack trace:', change.stack);
            
            // Analyser l'état du viewport
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] visualViewport.height:', (window as any).visualViewport?.height);
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] screen.height:', window.screen.height);
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] screen.availHeight:', window.screen.availHeight);
            
            // Vérifier les styles qui peuvent affecter la hauteur
            const bodyStyle = getComputedStyle(document.body);
            const htmlStyle = getComputedStyle(document.documentElement);
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] body.height:', bodyStyle.height);
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] html.height:', htmlStyle.height);
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] body.style:', document.body.style.cssText);
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] html.style:', document.documentElement.style.cssText);
          }
        }

        return newInfo;
      });
    };

    // Surveiller les événements qui peuvent déclencher des changements
    const eventHandlers = {
      resize: () => {
        const event = { timestamp: new Date().toLocaleTimeString(), event: 'resize', innerHeight: window.innerHeight };
        setEvents(prev => [event, ...prev.slice(0, 9)]);
        console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement resize:', event);
        updateHeightInfo();
      },
      orientationchange: () => {
        const event = { timestamp: new Date().toLocaleTimeString(), event: 'orientationchange', innerHeight: window.innerHeight };
        setEvents(prev => [event, ...prev.slice(0, 9)]);
        console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement orientationchange:', event);
        setTimeout(updateHeightInfo, 100); // Délai pour l'orientation
      },
      load: () => {
        const event = { timestamp: new Date().toLocaleTimeString(), event: 'load', innerHeight: window.innerHeight };
        setEvents(prev => [event, ...prev.slice(0, 9)]);
        console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement load:', event);
        updateHeightInfo();
      },
      DOMContentLoaded: () => {
        const event = { timestamp: new Date().toLocaleTimeString(), event: 'DOMContentLoaded', innerHeight: window.innerHeight };
        setEvents(prev => [event, ...prev.slice(0, 9)]);
        console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement DOMContentLoaded:', event);
        updateHeightInfo();
      },
      focus: () => {
        const event = { timestamp: new Date().toLocaleTimeString(), event: 'focus', innerHeight: window.innerHeight };
        setEvents(prev => [event, ...prev.slice(0, 9)]);
        console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement focus:', event);
        updateHeightInfo();
      },
      blur: () => {
        const event = { timestamp: new Date().toLocaleTimeString(), event: 'blur', innerHeight: window.innerHeight };
        setEvents(prev => [event, ...prev.slice(0, 9)]);
        console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement blur:', event);
        updateHeightInfo();
      },
    };

    // Surveiller les modifications du DOM qui peuvent affecter la hauteur
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          
          console.log('🔧 [INNERHEIGHT DIAGNOSTIC] Modification DOM:', {
            target: mutation.target.tagName,
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue,
            newValue: mutation.target.getAttribute(mutation.attributeName)
          });
          
          // Vérifier si cette modification affecte la hauteur
          setTimeout(updateHeightInfo, 10);
        }
      });
    });

    // Mise à jour initiale
    updateHeightInfo();

    // Ajouter les event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

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
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
      clearInterval(interval);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-[999999] max-w-sm text-xs font-mono max-h-96 overflow-y-auto">
      <div className="mb-2 font-bold text-yellow-400">🎯 InnerHeight Diagnostic</div>
      
      <div className="space-y-1">
        <div>innerHeight: <span className="text-yellow-300">{heightInfo.innerHeight}px</span></div>
        <div>innerWidth: <span className="text-yellow-300">{heightInfo.innerWidth}px</span></div>
        <div>visualViewport: <span className="text-blue-300">{heightInfo.visualViewportHeight}px</span></div>
        <div>screen.height: <span className="text-purple-300">{heightInfo.screenHeight}px</span></div>
        <div>screen.availHeight: <span className="text-purple-300">{heightInfo.availHeight}px</span></div>
      </div>

      {/* Info Tab Bar */}
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="font-bold text-green-400 mb-1">📱 Tab Bar:</div>
        <div className="space-y-1">
          <div>Found: <span className={tabBarInfo.found ? "text-green-300" : "text-red-300"}>{tabBarInfo.found ? "✅" : "❌"}</span></div>
          {tabBarInfo.found && (
            <>
              <div>Bottom: <span className="text-yellow-300">{tabBarInfo.bottom}px</span></div>
              <div>Top: <span className="text-yellow-300">{tabBarInfo.top}px</span></div>
              <div>Height: <span className="text-yellow-300">{tabBarInfo.height}px</span></div>
            </>
          )}
        </div>
      </div>

      {changes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-red-400 mb-1">⚠️ Changements innerHeight:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {changes.map((change, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{change.timestamp}</span>
                <br />
                <span className="text-red-300">innerHeight:</span> {change.from} → {change.to}
                <span className={`ml-1 ${change.difference > 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ({change.difference > 0 ? '+' : ''}{change.difference})
                </span>
                {change.from === 778 && change.to === 812 && (
                  <div className="text-yellow-300 font-bold">🎯 CHANGEMENT CIBLE!</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-blue-400 mb-1">📡 Événements récents:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{event.timestamp}</span>
                <br />
                <span className="text-blue-300">{event.event}:</span> {event.innerHeight}px
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
