#!/usr/bin/env node

/**
 * Script pour aider à voir les logs dans Xcode
 * Utilise les commandes de développement iOS pour capturer les logs
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Script de visualisation des logs Xcode pour AnisFlix\n');

// Fonction pour exécuter une commande et afficher le résultat
function runCommand(command, description) {
  try {
    console.log(`📱 ${description}...`);
    const result = execSync(command, { encoding: 'utf8', timeout: 5000 });
    console.log('✅ Succès:', result.trim());
    return result;
  } catch (error) {
    console.log('❌ Erreur:', error.message);
    return null;
  }
}

// Vérifier si nous sommes sur macOS
if (process.platform !== 'darwin') {
  console.log('❌ Ce script fonctionne uniquement sur macOS');
  process.exit(1);
}

// Vérifier si Xcode est installé
const xcodeInstalled = runCommand('xcode-select --print-path', 'Vérification de Xcode');
if (!xcodeInstalled) {
  console.log('❌ Xcode n\'est pas installé ou configuré');
  process.exit(1);
}

// Vérifier si le simulateur est disponible
const simulators = runCommand('xcrun simctl list devices available', 'Vérification des simulateurs');
if (!simulators) {
  console.log('❌ Aucun simulateur iOS disponible');
  process.exit(1);
}

console.log('\n📱 Simulateurs disponibles:');
console.log(simulators);

// Instructions pour voir les logs
console.log('\n🔍 Instructions pour voir les logs dans Xcode:\n');

console.log('1. Ouvrir Xcode:');
console.log('   npx cap open ios\n');

console.log('2. Lancer l\'app dans le simulateur:');
console.log('   - Cliquez sur le bouton "Play" dans Xcode');
console.log('   - Ou utilisez Cmd + R\n');

console.log('3. Ouvrir la console de debug:');
console.log('   - Dans Xcode: View > Debug Area > Activate Console');
console.log('   - Ou utilisez Cmd + Shift + C\n');

console.log('4. Filtrer les logs avec ces termes:');
console.log('   - ANISFLIX-TABBAR');
console.log('   - ANISFLIX-BOTTOMNAV');
console.log('   - TABBAR_DEBUG');
console.log('   - TABBAR_ERROR');
console.log('   - BOTTOMNAV_RENDER\n');

console.log('5. Alternative - Logs via terminal:');
console.log('   xcrun simctl spawn booted log stream --predicate "process == \'AnisFlix\'" --style compact\n');

console.log('6. Test de la tab bar:');
console.log('   - Scrollez jusqu\'en bas d\'une page');
console.log('   - Observez les logs dans Xcode');
console.log('   - Cherchez les messages d\'erreur TABBAR_ERROR\n');

// Créer un script de log automatique
const logScript = `#!/bin/bash
echo "🔍 Surveillance des logs AnisFlix..."
xcrun simctl spawn booted log stream --predicate "process == 'AnisFlix'" --style compact | grep -E "(ANISFLIX|TABBAR|BOTTOMNAV)"
`;

fs.writeFileSync('watch-logs.sh', logScript);
fs.chmodSync('watch-logs.sh', '755');

console.log('✅ Script de surveillance créé: ./watch-logs.sh');
console.log('   Utilisez: ./watch-logs.sh pour surveiller les logs en temps réel\n');

console.log('🎯 Logs importants à surveiller:');
console.log('   - TABBAR_ERROR: La tab bar a bougé de sa position fixe');
console.log('   - TABBAR_DEBUG: Position actuelle de la tab bar');
console.log('   - BOTTOMNAV_RENDER: Le composant BottomNav se re-rend');
console.log('   - TABBAR_TOUCH: Événements de touch détectés\n');

console.log('🚀 Prêt pour le debug !');
