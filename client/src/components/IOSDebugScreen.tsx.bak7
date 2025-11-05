import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function IOSDebugScreen() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const info = {
        isNative: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        documentReady: document.readyState,
        bodyExists: !!document.body,
        rootExists: !!document.getElementById('root')
      };
      
      setDebugInfo(info);
      console.log('🔍 Debug Info:', info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('❌ Debug Error:', err);
    }
  }, []);

  if (error) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'red', 
        color: 'white', 
        padding: '20px',
        fontSize: '16px',
        zIndex: 9999
      }}>
        <h1>❌ ERREUR DEBUG</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!debugInfo) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'orange', 
        color: 'white', 
        padding: '20px',
        fontSize: '16px',
        zIndex: 9999
      }}>
        <h1>🔄 Chargement...</h1>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'black', 
      color: 'white', 
      padding: '20px',
      fontSize: '14px',
      zIndex: 9999,
      overflow: 'auto'
    }}>
      <h1 style={{ color: 'green', marginBottom: '20px' }}>✅ DEBUG iOS - AnisFlix</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📱 Informations de plateforme</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>Mode natif:</strong> {debugInfo.isNative ? '✅ Oui' : '❌ Non'}</div>
          <div><strong>Plateforme:</strong> {debugInfo.platform}</div>
          <div><strong>User Agent:</strong> {debugInfo.userAgent}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🌐 Informations web</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>URL:</strong> {debugInfo.url}</div>
          <div><strong>Timestamp:</strong> {debugInfo.timestamp}</div>
          <div><strong>Document Ready:</strong> {debugInfo.documentReady}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>📐 Taille d'écran</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>Largeur:</strong> {debugInfo.screenSize.width}px</div>
          <div><strong>Hauteur:</strong> {debugInfo.screenSize.height}px</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔍 Éléments DOM</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>Body existe:</strong> {debugInfo.bodyExists ? '✅ Oui' : '❌ Non'}</div>
          <div><strong>Root existe:</strong> {debugInfo.rootExists ? '✅ Oui' : '❌ Non'}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🧪 Test de base</h2>
        <div style={{ marginLeft: '20px' }}>
          <div>Si vous voyez ce message, React fonctionne !</div>
          <div>Capacitor est configuré correctement.</div>
        </div>
      </div>

      <button 
        onClick={() => {
          console.log('🔍 Debug Info:', debugInfo);
          alert('Informations de debug envoyées dans la console');
        }}
        style={{
          background: 'blue',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        📋 Afficher dans la console
      </button>
    </div>
  );
}
