import { extractVidzyM3u8 } from '@/lib/movix';

export interface ScraperTestResult {
  url: string;
  success: boolean;
  m3u8Url?: string;
  error?: string;
  responseTime: number;
}

export async function testScraper(url: string): Promise<ScraperTestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Test du scraper pour: ${url}`);
    
    const m3u8Url = await extractVidzyM3u8(url);
    const responseTime = Date.now() - startTime;
    
    if (m3u8Url) {
      console.log(`✅ Succès! M3U8 extrait en ${responseTime}ms:`, m3u8Url);
      return {
        url,
        success: true,
        m3u8Url,
        responseTime
      };
    } else {
      console.log(`❌ Aucun M3U8 trouvé pour: ${url}`);
      return {
        url,
        success: false,
        error: 'Aucun M3U8 trouvé',
        responseTime
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    console.error(`❌ Erreur lors du test de ${url}:`, errorMessage);
    
    return {
      url,
      success: false,
      error: errorMessage,
      responseTime
    };
  }
}

// Fonction pour tester plusieurs URLs
export async function testMultipleUrls(urls: string[]): Promise<ScraperTestResult[]> {
  console.log(`🧪 Test de ${urls.length} URLs...`);
  
  const results = await Promise.all(
    urls.map(url => testScraper(url))
  );
  
  // Afficher le résumé
  const successCount = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(`📊 Résumé des tests:`);
  console.log(`   - Succès: ${successCount}/${urls.length}`);
  console.log(`   - Temps moyen: ${Math.round(avgResponseTime)}ms`);
  
  return results;
}

// URLs de test
export const TEST_URLS = {
  // Lien LuluStream que vous voulez tester
  LULUSTREAM: 'https://lulustream.com/e/yv1821qvwhep',
  
  // Liens Vidzy pour comparaison
  VIDZY_EXAMPLE: 'https://vidzy.org/embed-yvl9xkvquty6.html',
  
  // Autres liens potentiels
  OTHER_STREAMING: [
    'https://vidzy.org/embed-55txig2tzmdr.html',
    'https://lulustream.com/e/yv1821qvwhep'
  ]
};
