import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Version de debug simple pour iOS
function SimpleDebugScreen() {
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
      fontSize: '16px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h1 style={{ color: 'green', marginBottom: '20px' }}>🔍 DEBUG iOS - AnisFlix</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📱 Informations de base</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>User Agent:</strong> {navigator.userAgent}</div>
          <div><strong>URL:</strong> {window.location.href}</div>
          <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
          <div><strong>Screen:</strong> {window.innerWidth}x{window.innerHeight}</div>
          <div><strong>Document Ready:</strong> {document.readyState}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔍 Éléments DOM</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>Body existe:</strong> {document.body ? '✅ Oui' : '❌ Non'}</div>
          <div><strong>Root existe:</strong> {document.getElementById('root') ? '✅ Oui' : '❌ Non'}</div>
          <div><strong>Root children:</strong> {document.getElementById('root')?.children.length || 0}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🧪 Test Capacitor</h2>
        <div style={{ marginLeft: '20px' }}>
          <div><strong>Capacitor disponible:</strong> {typeof window !== 'undefined' && (window as any).Capacitor ? '✅ Oui' : '❌ Non'}</div>
          <div><strong>Mode natif:</strong> {typeof window !== 'undefined' && (window as any).Capacitor ? ((window as any).Capacitor.isNativePlatform ? 'Test...' : 'Fonction manquante') : 'N/A'}</div>
        </div>
      </div>

      <button 
        onClick={() => {
          console.log('🔍 Debug Info:', {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            screenSize: { width: window.innerWidth, height: window.innerHeight },
            documentReady: document.readyState,
            bodyExists: !!document.body,
            rootExists: !!document.getElementById('root'),
            capacitorAvailable: !!(window as any).Capacitor
          });
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

// Forcer l'affichage de debug pour iOS
const isIOS = navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') || navigator.userAgent.includes('iPad');
const AppComponent = isIOS ? SimpleDebugScreen : App;

createRoot(document.getElementById("root")!).render(<AppComponent />);
