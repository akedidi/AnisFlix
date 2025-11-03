export default function TestNative() {
  console.log('🧪 [TestNative] Component rendering');
  
  return (
    <div style={{
      backgroundColor: '#FF0000', // Rouge pour être visible
      color: '#FFFFFF',
      padding: '20px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      <h1 style={{ color: '#FFFFFF', fontSize: '32px', marginBottom: '20px' }}>
        TEST NATIVE
      </h1>
      <p style={{ color: '#FFFFFF', fontSize: '20px' }}>
        Si vous voyez ce texte en blanc sur fond rouge, le problème est dans CommonLayout
      </p>
      <p style={{ color: '#FFFFFF', fontSize: '16px', marginTop: '20px' }}>
        Plateforme détectée: {typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() || 'unknown'}
      </p>
    </div>
  );
}



