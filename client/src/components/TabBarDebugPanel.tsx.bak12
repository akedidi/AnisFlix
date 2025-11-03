import { useState, useEffect, useRef } from 'react';

interface TabBarPosition {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  position: string;
  bottomValue: string;
  zIndex: string;
}

export default function TabBarDebugPanel() {
  const [position, setPosition] = useState<TabBarPosition | null>(null);
  const [windowInfo, setWindowInfo] = useState({
    height: 0,
    scrollY: 0,
    scrollX: 0
  });
  const [logs, setLogs] = useState<string[]>([]);
  const navRef = useRef<HTMLElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]); // Garder seulement les 10 derniers logs
  };

  useEffect(() => {
    console.log('=== TABBAR DEBUG PANEL STARTED ===');
    
    const updateInfo = () => {
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(navRef.current);
        
        const newPosition: TabBarPosition = {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          position: computedStyle.position,
          bottomValue: computedStyle.bottom,
          zIndex: computedStyle.zIndex
        };

        setPosition(newPosition);
        setWindowInfo({
          height: window.innerHeight,
          scrollY: window.scrollY,
          scrollX: window.scrollX
        });

        // Vérifier si la tab bar bouge
        if (newPosition.bottom !== window.innerHeight && newPosition.position === 'fixed') {
          addLog(`⚠️ Tab bar moved! Expected: ${window.innerHeight}, Actual: ${newPosition.bottom}`);
        } else {
          addLog(`✅ Tab bar OK - Bottom: ${newPosition.bottom}, Window: ${window.innerHeight}`);
        }
      }
    };

    // Log initial
    addLog('Debug panel initialized');

    // Mettre à jour toutes les 100ms
    const interval = setInterval(updateInfo, 100);

    // Event listeners
    const handleScroll = () => updateInfo();
    const handleResize = () => updateInfo();
    const handleTouchStart = () => addLog('Touch start');
    const handleTouchEnd = () => addLog('Touch end');

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white text-xs p-2 rounded z-[999999] max-w-xs">
      <div className="font-bold mb-2">🔍 Tab Bar Debug</div>
      
      {position && (
        <div className="mb-2">
          <div>Position: {position.position}</div>
          <div>Bottom: {position.bottom.toFixed(1)}</div>
          <div>Window: {windowInfo.height}</div>
          <div>Scroll Y: {windowInfo.scrollY}</div>
          <div>Z-Index: {position.zIndex}</div>
          <div className={`mt-1 ${position.bottom === windowInfo.height ? 'text-green-400' : 'text-red-400'}`}>
            {position.bottom === windowInfo.height ? '✅ Fixed' : '❌ Moving'}
          </div>
        </div>
      )}

      <div className="border-t border-gray-600 pt-2">
        <div className="font-bold mb-1">Logs:</div>
        <div className="max-h-32 overflow-y-auto text-xs">
          {logs.map((log, index) => (
            <div key={index} className="mb-1 break-all">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
