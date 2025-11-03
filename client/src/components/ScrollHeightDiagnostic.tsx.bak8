import { useState, useEffect } from 'react';

interface ScrollHeightDiagnosticProps {
  enabled?: boolean;
}

export default function ScrollHeightDiagnostic({ enabled = true }: ScrollHeightDiagnosticProps) {
  const [scrollInfo, setScrollInfo] = useState({
    documentScrollHeight: 0,
    bodyScrollHeight: 0,
    documentClientHeight: 0,
    bodyClientHeight: 0,
  });

  const [changes, setChanges] = useState<Array<{
    timestamp: string;
    type: string;
    from: number;
    to: number;
    difference: number;
  }>>([]);

  const [domChanges, setDomChanges] = useState<Array<{
    timestamp: string;
    type: string;
    details: string;
  }>>([]);

  useEffect(() => {
    if (!enabled) return;

    const updateScrollInfo = () => {
      const newInfo = {
        documentScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        documentClientHeight: document.documentElement.clientHeight,
        bodyClientHeight: document.body.clientHeight,
      };

      setScrollInfo(prevInfo => {
        // Détecter les changements de scrollHeight
        if (prevInfo.documentScrollHeight !== newInfo.documentScrollHeight) {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'documentScrollHeight',
            from: prevInfo.documentScrollHeight,
            to: newInfo.documentScrollHeight,
            difference: newInfo.documentScrollHeight - prevInfo.documentScrollHeight,
          };
          setChanges(prev => [change, ...prev.slice(0, 9)]);
          console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] Changement documentScrollHeight:', change);
          
          // Si c'est un changement important (> 1000px)
          if (Math.abs(change.difference) > 1000) {
            console.log('🎯 [SCROLLHEIGHT DIAGNOSTIC] CHANGEMENT MAJEUR DÉTECTÉ:', change.difference, 'px');
            
            // Analyser les éléments avec de grandes hauteurs
            const allElements = document.querySelectorAll('*');
            const largeElements = [];
            
            allElements.forEach((el, index) => {
              if (el instanceof HTMLElement) {
                const rect = el.getBoundingClientRect();
                if (rect.height > 200) {
                  largeElements.push({
                    tagName: el.tagName,
                    className: el.className,
                    height: rect.height,
                    scrollHeight: el.scrollHeight,
                  });
                }
              }
            });
            
            console.log('📏 [SCROLLHEIGHT DIAGNOSTIC] Éléments avec hauteur > 200px:', largeElements.length);
            largeElements.forEach(el => {
              console.log('📏 [SCROLLHEIGHT DIAGNOSTIC]', el.tagName, el.className, 'height:', el.height, 'scrollHeight:', el.scrollHeight);
            });
          }
        }

        if (prevInfo.bodyScrollHeight !== newInfo.bodyScrollHeight) {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'bodyScrollHeight',
            from: prevInfo.bodyScrollHeight,
            to: newInfo.bodyScrollHeight,
            difference: newInfo.bodyScrollHeight - prevInfo.bodyScrollHeight,
          };
          setChanges(prev => [change, ...prev.slice(0, 9)]);
          console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] Changement bodyScrollHeight:', change);
        }

        return newInfo;
      });
    };

    // Surveiller les modifications du DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const change = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'DOM_CHANGE',
            details: `${mutation.addedNodes.length} ajoutés, ${mutation.removedNodes.length} supprimés`,
          };
          setDomChanges(prev => [change, ...prev.slice(0, 9)]);
          console.log('🔧 [SCROLLHEIGHT DIAGNOSTIC] Modification DOM:', change);
          
          // Vérifier le changement de scrollHeight après les modifications
          setTimeout(updateScrollInfo, 10);
        }
      });
    });

    // Mise à jour initiale
    updateScrollInfo();

    // Surveiller les événements
    const events = ['resize', 'scroll', 'load', 'DOMContentLoaded'];
    events.forEach(event => {
      window.addEventListener(event, updateScrollInfo);
    });

    // Surveiller les changements périodiques
    const interval = setInterval(updateScrollInfo, 1000);

    // Démarrer l'observation du DOM
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateScrollInfo);
      });
      clearInterval(interval);
      observer.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed top-4 left-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-[999999] max-w-sm text-xs font-mono max-h-96 overflow-y-auto">
      <div className="mb-2 font-bold text-blue-400">📏 ScrollHeight Diagnostic</div>
      
      <div className="space-y-1">
        <div>docScrollHeight: <span className="text-yellow-300">{scrollInfo.documentScrollHeight}px</span></div>
        <div>bodyScrollHeight: <span className="text-yellow-300">{scrollInfo.bodyScrollHeight}px</span></div>
        <div>docClientHeight: <span className="text-purple-300">{scrollInfo.documentClientHeight}px</span></div>
        <div>bodyClientHeight: <span className="text-purple-300">{scrollInfo.bodyClientHeight}px</span></div>
      </div>

      {changes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-red-400 mb-1">⚠️ Changements scrollHeight:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {changes.map((change, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{change.timestamp}</span>
                <br />
                <span className="text-red-300">{change.type}:</span> {change.from} → {change.to}
                <span className={`ml-1 ${change.difference > 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ({change.difference > 0 ? '+' : ''}{change.difference})
                </span>
                {Math.abs(change.difference) > 1000 && (
                  <div className="text-yellow-300 font-bold">🎯 CHANGEMENT MAJEUR!</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {domChanges.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-600">
          <div className="font-bold text-blue-400 mb-1">🔧 Modifications DOM:</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {domChanges.map((change, index) => (
              <div key={index} className="text-xs">
                <span className="text-gray-400">{change.timestamp}</span>
                <br />
                <span className="text-blue-300">{change.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
