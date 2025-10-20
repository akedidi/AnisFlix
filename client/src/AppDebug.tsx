import React from 'react';
import IOSDebugScreen from './components/IOSDebugScreen';
import { Capacitor } from '@capacitor/core';

function AppDebug() {
  const isNative = Capacitor.isNativePlatform();
  
  return (
    <div>
      {isNative ? (
        <IOSDebugScreen />
      ) : (
        <div style={{ 
          padding: '20px', 
          background: 'lightblue', 
          color: 'black',
          minHeight: '100vh'
        }}>
          <h1>🌐 Mode Web</h1>
          <p>Cette version de debug est pour iOS uniquement.</p>
          <p>Plateforme détectée: {Capacitor.getPlatform()}</p>
        </div>
      )}
    </div>
  );
}

export default AppDebug;
