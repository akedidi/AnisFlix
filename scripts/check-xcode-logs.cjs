#!/usr/bin/env node

/**
 * Script pour vérifier les logs Xcode et diagnostiquer l'écran noir
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification des logs Xcode et diagnostic écran noir\n');

// Vérifications
const checks = [
  {
    name: 'Simulateur iOS disponible',
    check: () => {
      try {
        const output = execSync('xcrun simctl list devices available', { encoding: 'utf8' });
        const hasIOSSimulator = output.includes('iPhone') || output.includes('iPad');
        if (!hasIOSSimulator) {
          throw new Error('Aucun simulateur iOS trouvé');
        }
        return true;
      } catch (error) {
        throw new Error('Erreur lors de la vérification des simulateurs: ' + error.message);
      }
    }
  },
  {
    name: 'Xcode installé',
    check: () => {
      try {
        execSync('xcode-select --print-path', { encoding: 'utf8' });
        return true;
      } catch (error) {
        throw new Error('Xcode non installé ou non configuré');
      }
    }
  },
  {
    name: 'Fichiers iOS synchronisés',
    check: () => {
      const iosPublicDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'public');
      if (!fs.existsSync(iosPublicDir)) {
        throw new Error('Dossier public iOS manquant');
      }
      
      const files = fs.readdirSync(iosPublicDir);
      const hasIndex = files.includes('index.html');
      
      if (!hasIndex) {
        throw new Error('index.html manquant dans iOS');
      }
      
      // Vérifier le contenu de index.html
      const indexPath = path.join(iosPublicDir, 'index.html');
      const content = fs.readFileSync(indexPath, 'utf8');
      
      if (content.includes('TEST ULTRA SIMPLE iOS')) {
        console.log('   ✅ Version de test détectée');
      } else if (content.includes('root')) {
        console.log('   ✅ Version React détectée');
      } else {
        console.log('   ⚠️  Contenu index.html inconnu');
      }
      
      return true;
    }
  },
  {
    name: 'Configuration Capacitor iOS',
    check: () => {
      const configPath = path.join(__dirname, '..', 'ios', 'App', 'App', 'capacitor.config.json');
      if (!fs.existsSync(configPath)) {
        throw new Error('capacitor.config.json manquant dans iOS');
      }
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!config.appId || !config.appName || !config.webDir) {
        throw new Error('Configuration Capacitor incomplète');
      }
      
      console.log(`   📱 App ID: ${config.appId}`);
      console.log(`   📱 App Name: ${config.appName}`);
      console.log(`   📱 Web Dir: ${config.webDir}`);
      
      return true;
    }
  },
  {
    name: 'Plugins iOS installés',
    check: () => {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      const requiredPlugins = ['@capacitor/core', '@capacitor/ios'];
      const missingPlugins = [];
      
      for (const plugin of requiredPlugins) {
        if (!packageJson.dependencies[plugin] && !packageJson.devDependencies[plugin]) {
          missingPlugins.push(plugin);
        }
      }
      
      if (missingPlugins.length > 0) {
        throw new Error(`Plugins manquants: ${missingPlugins.join(', ')}`);
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
  console.log('\n🎉 Configuration iOS valide !');
  console.log('\n📱 Instructions pour résoudre l\'écran noir :');
  console.log('1. Dans Xcode, allez dans Product → Clean Build Folder');
  console.log('2. Fermez le simulateur');
  console.log('3. Relancez l\'application (Cmd+R)');
  console.log('4. Vérifiez la console Xcode pour les erreurs');
  console.log('5. Si toujours noir, essayez un autre simulateur');
} else {
  console.log('\n⚠️  Problèmes détectés. Corrigez-les avant de tester.');
}

// Instructions supplémentaires
console.log('\n🔧 Solutions supplémentaires :');
console.log('1. Vérifiez que le simulateur iOS est à jour');
console.log('2. Essayez un simulateur iPhone différent');
console.log('3. Redémarrez Xcode complètement');
console.log('4. Vérifiez les logs de la console Xcode');
console.log('5. Testez sur un appareil physique si possible');

console.log('\n📋 Commandes utiles :');
console.log('- Ouvrir Xcode: npx cap open ios');
console.log('- Lister simulateurs: xcrun simctl list devices available');
console.log('- Nettoyer build: Product → Clean Build Folder dans Xcode');
