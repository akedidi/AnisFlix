#!/usr/bin/env node

/**
 * Script de diagnostic pour écran noir iOS
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnostic écran noir iOS - AnisFlix\n');

// Vérifications
const checks = [
  {
    name: 'Fichier index.html',
    check: () => {
      const indexPath = path.join(__dirname, '..', 'dist', 'public', 'index.html');
      if (!fs.existsSync(indexPath)) {
        throw new Error('index.html manquant dans dist/public');
      }
      const content = fs.readFileSync(indexPath, 'utf8');
      if (!content.includes('root')) {
        throw new Error('Élément root manquant dans index.html');
      }
      if (!content.includes('script')) {
        throw new Error('Scripts manquants dans index.html');
      }
      return true;
    }
  },
  {
    name: 'Fichiers JS/CSS',
    check: () => {
      const publicDir = path.join(__dirname, '..', 'dist', 'public');
      const assetsDir = path.join(publicDir, 'assets');
      
      if (!fs.existsSync(assetsDir)) {
        throw new Error('Dossier assets manquant dans dist/public');
      }
      
      const files = fs.readdirSync(assetsDir);
      const hasJS = files.some(f => f.endsWith('.js'));
      const hasCSS = files.some(f => f.endsWith('.css'));
      
      if (!hasJS) {
        throw new Error('Aucun fichier JS trouvé dans dist/public/assets');
      }
      if (!hasCSS) {
        throw new Error('Aucun fichier CSS trouvé dans dist/public/assets');
      }
      return true;
    }
  },
  {
    name: 'Configuration Capacitor iOS',
    check: () => {
      const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
      if (!fs.existsSync(configPath)) {
        throw new Error('capacitor.config.ts manquant');
      }
      const config = fs.readFileSync(configPath, 'utf8');
      if (!config.includes('webDir: \'dist/public\'')) {
        throw new Error('webDir incorrect dans capacitor.config.ts');
      }
      return true;
    }
  },
  {
    name: 'Fichiers iOS synchronisés',
    check: () => {
      const iosPublicDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'public');
      if (!fs.existsSync(iosPublicDir)) {
        throw new Error('Dossier public iOS manquant - exécutez "npx cap sync ios"');
      }
      const files = fs.readdirSync(iosPublicDir);
      if (files.length === 0) {
        throw new Error('Dossier public iOS vide');
      }
      return true;
    }
  },
  {
    name: 'Configuration iOS Info.plist',
    check: () => {
      const infoPlistPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
      if (!fs.existsSync(infoPlistPath)) {
        throw new Error('Info.plist manquant');
      }
      const plist = fs.readFileSync(infoPlistPath, 'utf8');
      if (!plist.includes('WKAllowsInlineMediaPlayback')) {
        throw new Error('Configuration WebKit manquante');
      }
      return true;
    }
  },
  {
    name: 'Plugins Capacitor installés',
    check: () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const requiredPlugins = ['@capacitor/core', '@capacitor/ios'];
      
      for (const plugin of requiredPlugins) {
        if (!packageJson.dependencies[plugin] && !packageJson.devDependencies[plugin]) {
          throw new Error(`Plugin manquant: ${plugin}`);
        }
      }
      return true;
    }
  }
];

// Exécution des tests
let passed = 0;
let failed = 0;

for (const check of checks) {
  try {
    console.log(`🔍 ${check.name}...`);
    check.check();
    console.log(`✅ ${check.name} - OK\n`);
    passed++;
  } catch (error) {
    console.log(`❌ ${check.name} - ÉCHEC`);
    console.log(`   ${error.message}\n`);
    failed++;
  }
}

// Résumé
console.log('📊 Résumé du diagnostic:');
console.log(`✅ Réussis: ${passed}`);
console.log(`❌ Échoués: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 Tous les tests sont passés !');
  console.log('\n📱 Si l\'écran est toujours noir, essayez :');
  console.log('1. Nettoyer et reconstruire : npm run build && npx cap sync ios');
  console.log('2. Dans Xcode : Product → Clean Build Folder');
  console.log('3. Redémarrer le simulateur');
  console.log('4. Vérifier la console Xcode pour les erreurs');
} else {
  console.log('\n⚠️  Problèmes détectés. Corrigez-les avant de tester.');
  
  if (failed === 1 && checks.find(c => c.name === 'Fichiers iOS synchronisés')) {
    console.log('\n🔧 Solution rapide :');
    console.log('npx cap sync ios');
  }
}

// Suggestions supplémentaires
console.log('\n🔧 Solutions supplémentaires pour écran noir :');
console.log('1. Vérifier que le simulateur iOS est à jour');
console.log('2. Tester sur un appareil physique si possible');
console.log('3. Vérifier les logs Xcode pour erreurs JavaScript');
console.log('4. S\'assurer que l\'URL de base est correcte');
console.log('5. Tester la version de debug qui affiche les infos de plateforme');
