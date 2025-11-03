import { useState, useEffect } from 'react';

interface WindowDiagnosticProps {
  enabled?: boolean;
}

export default function WindowDiagnostic({ enabled = true }: WindowDiagnosticProps) {
  const [windowInfo, setWindowInfo] = useState({
    innerHeight: 0,
    innerWidth: 0,
    scrollHeight: 0,
    clientHeight: 0,
    scrollY: 0,
    scrollX: 0,
  });

  const [changes, setChanges] = useState<Array<{
    timestamp: string;
    type: string;
    from: number;
    to: number;
    difference: number;
    stack?: string;
  }>>([]);

  const [domModifications, setDomModifications] = useState<Array<{
    timestamp: string;
    target: string;
    attribute: string;
    oldValue: string;
    newValue: string;
  }>>([]);

  useEffect(() => {
    if (!enabled) return;

    const updateWindowInfo = () => {
      const newInfo = {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        scrollY: window.scrollY,
        scrollX: window.scrollX,
      };

      setWindowInfo(prevInfo => {
        // Détecter les changements
        if (prevInfo.innerHeight !== newInfo.innerHeight) {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'innerHeight',
            from: prevInfo.innerHeight,
            to: newInfo.innerHeight,
            difference: newInfo.innerHeight - prevInfo.innerHeight,
            stack: new Error().stack,
          };
          setChanges(prev => [change, ...prev.slice(0, 9)]); // Garder seulement les 10 derniers
          console.log('🔍 [WINDOW DIAGNOSTIC] Changement innerHeight:', change);
          
          // Si c'est le changement spécifique 778 → 812
          if (prevInfo.innerHeight === 778 && newInfo.innerHeight === 812) {
            console.log('🎯 [WINDOW DIAGNOSTIC] CHANGEMENT CIBLE DÉTECTÉ: 778 → 812');
            console.log('🎯 [WINDOW DIAGNOSTIC] Stack trace:', change.stack);
            
            // Analyser l'état du DOM
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
              const computedStyle = getComputedStyle(mainContent);
              console.log('📏 [WINDOW DIAGNOSTIC] .main-content padding-bottom:', computedStyle.paddingBottom);
            }
            
            const bodyStyle = getComputedStyle(document.body);
            console.log('📏 [WINDOW DIAGNOSTIC] body padding-bottom:', bodyStyle.paddingBottom);
            console.log('📏 [WINDOW DIAGNOSTIC] body.style:', document.body.style.cssText);
          }
        }

        if (prevInfo.scrollHeight !== newInfo.scrollHeight) {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'scrollHeight',
            from: prevInfo.scrollHeight,
            to: newInfo.scrollHeight,
            difference: newInfo.scrollHeight - prevInfo.scrollHeight,
          };
          setChanges(prev => [change, ...prev.slice(0, 9)]);
          console.log('🔍 [WINDOW DIAGNOSTIC] Changement scrollHeight:', change);
        }

        return newInfo;
      });
    };

    // Surveiller les modifications du DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          
          const modification = {
            timestamp: new Date().toLocaleTimeString(),
            target: mutation.target.tagName + (mutation.target.className ? '.' + mutation.target.className : ''),
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue || '',
            newValue: mutation.target.getAttribute(mutation.attributeName) || '',
          };
          
          setDomModifications(prev => [modification, ...prev.slice(0, 9)]);
          console.log('🔧 [WINDOW DIAGNOSTIC] Modification DOM:', modification);
          
          // Vérifier si cette modification cause un changement de hauteur
          setTimeout(updateWindowInfo, 10);
        }
      });
    });

    // Mise à jour initiale
    updateWindowInfo();

    // Surveiller les événements
    const events = ['resize', 'scroll', 'orientationchange', 'load', 'DOMContentLoaded'];
    events.forEach(event => {
      window.addEventListener(event, updateWindowInfo);
    });

    // Surveiller les changements périodiques
    const interval = setInterval(updateWindowInfo, 1000);

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
      events.forEach(event => {
        window.removeEventListener(event, updateWindowInfo);
      });
      clearInterval(interval);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-[999999] max-w-sm text-xs font-mono max-h-96 overflow-y-auto">
      <div className="mb-2 font-bold text-green-400">🔍 Window Diagnostic</div>
      
      <div className="space-y-1">
        <div>innerHeight: <span className="text-yellow-300">{windowInfo.innerHeight}px</span></div>
        <div>innerWidth: <span className="text-yellow-300">{windowInfo.innerWidth}px</span></div>
        <div>scrollHeight: <span className="text-blue-300">{windowInfo.scrollHeight}px</span></div>
        <div>clientHeight: <span className="text-purple-300">{windowInfo.clientHeight}px</span></div>
        <div>scrollY: <span className="text-orange-300">{windowInfo.scrollY}px</span></div>
        <div>scrollX: <span className="text-orange-300">{windowInfo.scrollX}px</span></div>
      </div>

      {changes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-red-400 mb-1">⚠️ Changements récents:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {changes.map((change, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{change.timestamp}</span>
                <br />
                <span className="text-red-300">{change.type}:</span> {change.from} → {change.to}
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

      {domModifications.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-blue-400 mb-1">🔧 Modifications DOM:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {domModifications.map((mod, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{mod.timestamp}</span>
                <br />
                <span className="text-blue-300">{mod.target}</span> {mod.attribute}
                {mod.attribute === 'style' && mod.newValue.includes('padding') && (
                  <div className="text-yellow-300 font-bold">📏 PADDING MODIFIÉ!</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
