#!/bin/bash

echo "🔧 Correction des erreurs Capacitor Sync et Push"
echo "================================================"

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Erreur : Fichier capacitor.config.ts non trouvé"
    echo "   Veuillez exécuter ce script depuis la racine du projet"
    exit 1
fi

echo "✅ Répertoire de travail correct"

# Nettoyer les caches
echo ""
echo "🧹 Nettoyage des caches..."
npm cache clean --force
rm -rf node_modules/.cache
rm -rf dist
rm -rf .capacitor

# Reinstaller les dépendances
echo ""
echo "📦 Réinstallation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

# Build du projet
echo ""
echo "🔨 Build du projet..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

# Synchroniser Capacitor
echo ""
echo "🔄 Synchronisation Capacitor..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la synchronisation"
    echo "   Tentative de correction..."
    
    # Nettoyer les dossiers natifs
    rm -rf ios/App/App/public
    rm -rf android/app/src/main/assets/public
    
    # Resynchroniser
    npx cap sync --force
fi

# Vérifier la configuration
echo ""
echo "🔍 Vérification de la configuration..."

# Vérifier les fichiers de configuration
if [ -f "ios/App/App/capacitor.config.json" ]; then
    echo "✅ Configuration iOS trouvée"
else
    echo "❌ Configuration iOS manquante"
fi

if [ -f "android/app/src/main/assets/capacitor.config.json" ]; then
    echo "✅ Configuration Android trouvée"
else
    echo "❌ Configuration Android manquante"
fi

# Vérifier les plugins
echo ""
echo "🔌 Vérification des plugins Capacitor..."
npx cap doctor

echo ""
echo "✅ Correction terminée !"
echo ""
echo "📱 Prochaines étapes :"
echo "   - Pour iOS : npx cap open ios"
echo "   - Pour Android : npx cap open android"
echo ""
echo "🔧 Si des erreurs persistent :"
echo "   - Vérifiez les logs avec : npx cap doctor"
echo "   - Nettoyez Xcode : Product → Clean Build Folder"
echo "   - Redémarrez Android Studio"
