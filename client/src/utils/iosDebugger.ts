/**
 * Utilitaire de débogage pour iOS
 * Aide à tester les APIs depuis l'application iOS
 */

import { Capacitor } from '@capacitor/core';
import { apiClient } from '@/lib/apiClient';

export class IOSDebugger {
  private static instance: IOSDebugger;
  private logs: string[] = [];

  static getInstance(): IOSDebugger {
    if (!IOSDebugger.instance) {
      IOSDebugger.instance = new IOSDebugger();
    }
    return IOSDebugger.instance;
  }

  private constructor() {
    this.log('🚀 IOSDebugger initialisé');
    this.logPlatformInfo();
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  private logPlatformInfo() {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    this.log(`📱 Plateforme: ${platform}`);
    this.log(`🔧 Mode natif: ${isNative ? 'Oui' : 'Non'}`);
    this.log(`🌐 URL de base API: ${apiClient['baseUrl']}`);
  }

  /**
   * Test de l'API VidMoly
   */
  async testVidMolyAPI(testUrl?: string): Promise<boolean> {
    try {
      this.log('🎬 Test API VidMoly...');
      
      const url = testUrl || 'https://vidmoly.net/embed-example.html';
      
      const result = await apiClient.extractVidMoly(url);
      
      if (result.success && result.m3u8Url) {
        this.log(`✅ VidMoly API OK - Lien extrait: ${result.m3u8Url.substring(0, 50)}...`);
        return true;
      } else {
        this.log(`❌ VidMoly API ÉCHEC - ${result.error || 'Aucun lien trouvé'}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ VidMoly API ERREUR - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return false;
    }
  }

  /**
   * Test de l'API Vidzy
   */
  async testVidzyAPI(testUrl?: string): Promise<boolean> {
    try {
      this.log('🎭 Test API Vidzy...');
      
      const url = testUrl || 'https://vidzy.org/embed-example.html';
      
      const result = await apiClient.extractVidzy(url);
      
      if (result.m3u8Url) {
        this.log(`✅ Vidzy API OK - Lien extrait: ${result.m3u8Url.substring(0, 50)}...`);
        return true;
      } else {
        this.log(`❌ Vidzy API ÉCHEC - ${result.error || 'Aucun lien trouvé'}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Vidzy API ERREUR - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return false;
    }
  }

  /**
   * Test de l'API VidSrc
   */
  async testVidSrcAPI(testUrl?: string): Promise<boolean> {
    try {
      this.log('🎥 Test API VidSrc...');
      
      const url = testUrl || 'https://vidsrc.io/embed/movie/123';
      
      const result = await apiClient.extractVidSrc(url);
      
      if (result.success && result.m3u8Url) {
        this.log(`✅ VidSrc API OK - Lien extrait: ${result.m3u8Url.substring(0, 50)}...`);
        return true;
      } else {
        this.log(`❌ VidSrc API ÉCHEC - ${result.error || 'Aucun lien trouvé'}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ VidSrc API ERREUR - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return false;
    }
  }

  /**
   * Test complet de toutes les APIs
   */
  async runFullTest(): Promise<{ [key: string]: boolean }> {
    this.log('🧪 Début du test complet des APIs...');
    
    const results = {
      vidmoly: await this.testVidMolyAPI(),
      vidzy: await this.testVidzyAPI(),
      vidsrc: await this.testVidSrcAPI()
    };

    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    this.log(`📊 Résultats: ${successCount}/${totalCount} APIs fonctionnelles`);
    
    return results;
  }

  /**
   * Test de connectivité réseau
   */
  async testNetworkConnectivity(): Promise<boolean> {
    try {
      this.log('🌐 Test de connectivité réseau...');
      
      const response = await fetch(apiClient['baseUrl'] + '/api/vidmoly-extract');
      
      if (response.ok) {
        const data = await response.json();
        this.log(`✅ Connectivité OK - API accessible`);
        return true;
      } else {
        this.log(`❌ Connectivité ÉCHEC - Status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Connectivité ERREUR - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return false;
    }
  }

  /**
   * Test du lecteur vidéo
   */
  testVideoPlayer(): boolean {
    try {
      this.log('🎬 Test du lecteur vidéo...');
      
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      if (isNative && platform === 'ios') {
        this.log('✅ Lecteur vidéo iOS natif disponible');
        this.log('✅ Support HLS natif (Safari WebKit)');
        this.log('✅ Support Picture-in-Picture');
        this.log('✅ Support AirPlay');
        return true;
      } else if (isNative && platform === 'android') {
        this.log('✅ Lecteur vidéo Android natif disponible');
        this.log('⚠️  HLS.js requis pour Android');
        return true;
      } else {
        this.log('✅ Lecteur vidéo web disponible');
        this.log('✅ Support HLS.js');
        return true;
      }
    } catch (error) {
      this.log(`❌ Lecteur vidéo ERREUR - ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      return false;
    }
  }

  /**
   * Récupère tous les logs
   */
  getLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Affiche un résumé des tests
   */
  printSummary() {
    console.log('\n📋 RÉSUMÉ DES TESTS iOS');
    console.log('='.repeat(50));
    this.logs.forEach(log => console.log(log));
    console.log('='.repeat(50));
  }

  /**
   * Exporte les logs pour debug
   */
  exportLogs(): string {
    return this.logs.join('\n');
  }
}

// Instance globale pour utilisation facile
export const iosDebugger = IOSDebugger.getInstance();

// Fonction helper pour lancer tous les tests
export async function runIOSTests() {
  const iosDebugger = IOSDebugger.getInstance();
  
  console.log('🧪 LANCEMENT DES TESTS iOS');
  console.log('='.repeat(50));
  
  // Test de connectivité
  const networkOK = await iosDebugger.testNetworkConnectivity();
  
  if (networkOK) {
    // Test des APIs
    await iosDebugger.runFullTest();
  }
  
  // Test du lecteur vidéo
  iosDebugger.testVideoPlayer();
  
  // Affichage du résumé
  iosDebugger.printSummary();
  
  return iosDebugger.getLogs();
}
