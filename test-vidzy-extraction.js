// Test de l'extraction Vidzy
const testVidzyExtraction = async () => {
  try {
    console.log('🧪 Test extraction Vidzy...');
    
    const response = await fetch('https://anisflix.vercel.app/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'vidzy',
        url: 'https://vidzy.org/embed-2ikbxh547hpd.html'
      })
    });
    
    const data = await response.json();
    console.log('📡 API Response:', data);
    
    if (data.success && data.extractedUrl) {
      console.log('✅ Extraction réussie !');
      console.log('🔗 URL M3U8 extraite:', data.extractedUrl);
      
      // Tester si l'URL M3U8 est accessible
      try {
        const m3u8Response = await fetch(data.extractedUrl, { method: 'HEAD' });
        console.log('🌐 M3U8 accessible:', m3u8Response.status);
      } catch (error) {
        console.log('❌ M3U8 non accessible:', error.message);
      }
    } else {
      console.log('❌ Échec extraction:', data.message);
    }
  } catch (error) {
    console.error('💥 Erreur test:', error);
  }
};

// Exécuter le test
testVidzyExtraction();
