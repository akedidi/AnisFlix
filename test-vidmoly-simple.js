const axios = require('axios');

async function testVidMolyAPI() {
  try {
    console.log('🧪 Test de l\'API VidMoly corrigée...');
    
    // Test avec une URL VidMoly d'exemple
    const testUrl = 'https://vidmoly.net/embed-abc123.html';
    
    const response = await axios.post('http://localhost:3000/api/vidmoly-test', {
      url: testUrl
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Réponse API:', response.data);
    
    if (response.data.success) {
      console.log('🎬 Lien m3u8:', response.data.m3u8Url);
      console.log('🔧 Méthode:', response.data.method);
      console.log('📝 URL de test:', response.data.testUrl);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testVidMolyAPI();
