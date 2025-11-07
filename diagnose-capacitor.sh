#!/bin/bash

echo "🔍 Diagnostic complet Capacitor"
echo "================================"

# Vérifier l'environnement
echo ""
echo "🌍 Environnement :"
echo "   - Node.js : $(node --version 2>/dev/null || echo 'Non installé')"
echo "   - npm : $(npm --version 2>/dev/null || echo 'Non installé')"
echo "   - Capacitor CLI : $(npx cap --version 2>/dev/null || echo 'Non installé')"

# Vérifier les fichiers de configuration
echo ""
echo "📁 Fichiers de configuration :"
if [ -f "capacitor.config.ts" ]; then
    echo "✅ capacitor.config.ts"
else
    echo "❌ capacitor.config.ts manquant"
fi

if [ -f "package.json" ]; then
    echo "✅ package.json"
else
    echo "❌ package.json manquant"
fi

# Vérifier les dépendances Capacitor
echo ""
echo "📦 Dépendances Capacitor :"
if grep -q "@capacitor/core" package.json; then
    echo "✅ @capacitor/core"
else
    echo "❌ @capacitor/core manquant"
fi

if grep -q "@capacitor/cli" package.json; then
    echo "✅ @capacitor/cli"
else
    echo "❌ @capacitor/cli manquant"
fi

if grep -q "@capacitor/ios" package.json; then
    echo "✅ @capacitor/ios"
else
    echo "❌ @capacitor/ios manquant"
fi

if grep -q "@capacitor/android" package.json; then
    echo "✅ @capacitor/android"
else
    echo "❌ @capacitor/android manquant"
fi

# Vérifier les dossiers natifs
echo ""
echo "📱 Dossiers natifs :"
if [ -d "ios" ]; then
    echo "✅ Dossier iOS"
    if [ -f "ios/App/App/capacitor.config.json" ]; then
        echo "✅ Configuration iOS"
    else
        echo "❌ Configuration iOS manquante"
    fi
else
    echo "❌ Dossier iOS manquant"
fi

if [ -d "android" ]; then
    echo "✅ Dossier Android"
    if [ -f "android/app/src/main/assets/capacitor.config.json" ]; then
        echo "✅ Configuration Android"
    else
        echo "❌ Configuration Android manquante"
    fi
else
    echo "❌ Dossier Android manquant"
fi

# Vérifier le build
echo ""
echo "🔨 Build :"
if [ -d "dist" ]; then
    echo "✅ Dossier dist"
    if [ -f "dist/index.html" ]; then
        echo "✅ index.html"
    else
        echo "❌ index.html manquant"
    fi
else
    echo "❌ Dossier dist manquant"
fi

# Vérifier les erreurs de synchronisation
echo ""
echo "🔄 Test de synchronisation :"
npx cap doctor 2>&1 | while read line; do
    if [[ $line == *"ERROR"* ]] || [[ $line == *"Error"* ]]; then
        echo "❌ $line"
    elif [[ $line == *"WARN"* ]] || [[ $line == *"Warning"* ]]; then
        echo "⚠️  $line"
    else
        echo "✅ $line"
    fi
done

# Vérifier les permissions
echo ""
echo "🔐 Permissions :"
if [ -w "ios" ] 2>/dev/null; then
    echo "✅ Permissions iOS"
else
    echo "❌ Permissions iOS insuffisantes"
fi

if [ -w "android" ] 2>/dev/null; then
    echo "✅ Permissions Android"
else
    echo "❌ Permissions Android insuffisantes"
fi

# Vérifier les caches
echo ""
echo "🗑️  Caches :"
if [ -d "node_modules/.cache" ]; then
    echo "⚠️  Cache npm présent"
else
    echo "✅ Cache npm propre"
fi

if [ -d ".capacitor" ]; then
    echo "⚠️  Cache Capacitor présent"
else
    echo "✅ Cache Capacitor propre"
fi

echo ""
echo "📋 Résumé du diagnostic :"
echo "========================="
echo "   - Configuration : Vérifiez les fichiers ci-dessus"
echo "   - Dépendances : Installez les packages manquants"
echo "   - Build : Exécutez 'npm run build' si nécessaire"
echo "   - Sync : Exécutez 'npx cap sync' pour synchroniser"
echo ""
echo "🔧 Scripts de correction disponibles :"
echo "   - ./fix-capacitor-sync.sh : Corriger la synchronisation"
echo "   - ./fix-push-notifications.sh : Corriger les notifications"
echo ""
echo "💡 Pour plus d'aide :"
echo "   - npx cap doctor : Diagnostic détaillé"
echo "   - npx cap sync --force : Synchronisation forcée"
echo "   - npm run build : Rebuild du projet"
