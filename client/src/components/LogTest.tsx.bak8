import { useEffect } from 'react';

export default function LogTest() {
  useEffect(() => {
    console.log('=== LOG TEST COMPONENT LOADED ===');
    console.log('Time:', new Date().toISOString());
    console.log('Window dimensions:', {
      width: window.innerWidth,
      height: window.innerHeight
    });
    
    // Test log toutes les secondes
    const interval = setInterval(() => {
      console.log('LOG TEST: Still alive at', new Date().toLocaleTimeString());
    }, 1000);
    
    return () => {
      console.log('=== LOG TEST COMPONENT UNMOUNTED ===');
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-4 left-4 bg-red-500 text-white p-2 rounded z-[999999] text-xs">
      LOG TEST ACTIVE
    </div>
  );
}
