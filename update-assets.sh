#!/bin/bash

echo "🔄 Mise à jour des assets ANISFLIX"
echo "================================="

# Vérifier si les fichiers existent
if [ ! -f "assets/icon.png" ]; then
    echo "❌ Erreur : assets/icon.png manquant"
    echo "   Veuillez d'abord générer l'icône avec generate-assets.html"
    exit 1
fi

if [ ! -f "assets/splash.png" ]; then
    echo "❌ Erreur : assets/splash.png manquant"
    echo "   Veuillez d'abord générer le splash screen avec generate-assets.html"
    exit 1
fi

echo "✅ Assets trouvés :"
echo "   - assets/icon.png"
echo "   - assets/splash.png"

echo ""
echo "🔧 Synchronisation avec Capacitor..."

# Build du projet
echo "📦 Build du projet..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build"
    exit 1
fi

# Sync Capacitor
echo "🔄 Synchronisation Capacitor..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la synchronisation"
    exit 1
fi

echo ""
echo "✅ Synchronisation terminée !"
echo ""
echo "📱 Prochaines étapes :"
echo "   - Pour iOS : npx cap open ios"
echo "   - Pour Android : npx cap open android"
echo ""
echo "🎯 L'icône et le splash screen devraient maintenant être visibles dans l'app native !"
