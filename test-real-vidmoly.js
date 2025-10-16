const axios = require('axios');

async function testRealVidMolyExtraction() {
  try {
    console.log('🧪 Test d\'extraction du vrai lien VidMoly...');
    
    // Test avec le vrai lien VidMoly du film 950396
    const realVidMolyUrl = 'https://vidmoly.net/embed-y7b7n94x0j80.html';
    
    const response = await axios.post('http://localhost:3000/api/vidmoly-test', {
      url: realVidMolyUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Réponse API:', response.data);
    
    if (response.data.success) {
      console.log('🎬 Lien m3u8:', response.data.m3u8Url);
      console.log('🔧 Méthode:', response.data.method);
      
      if (response.data.method === 'extracted_real') {
        console.log('🎉 SUCCÈS: Vrai lien VidMoly extrait !');
      } else if (response.data.method === 'fallback') {
        console.log('⚠️ FALLBACK: Utilisation du lien de démonstration');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testRealVidMolyExtraction();
