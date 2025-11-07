#!/bin/bash

echo "🔄 Mise à jour des assets ANISFLIX dans l'app native"
echo "=================================================="

# Vérifier si les fichiers existent
if [ ! -f "assets/icon.png" ]; then
    echo "❌ Erreur : assets/icon.png manquant"
    echo "   Veuillez d'abord télécharger l'icône avec create-assets.html"
    exit 1
fi

if [ ! -f "assets/splash.png" ]; then
    echo "❌ Erreur : assets/splash.png manquant"
    echo "   Veuillez d'abord télécharger le splash screen avec create-assets.html"
    exit 1
fi

echo "✅ Assets trouvés :"
echo "   - assets/icon.png"
echo "   - assets/splash.png"

# Vérifier les tailles
ICON_SIZE=$(file assets/icon.png | grep -o '[0-9]*x[0-9]*')
SPLASH_SIZE=$(file assets/splash.png | grep -o '[0-9]*x[0-9]*')

echo "   - Icône : $ICON_SIZE"
echo "   - Splash : $SPLASH_SIZE"

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
echo ""
echo "   Pour iOS :"
echo "   npx cap open ios"
echo "   # Puis compilez dans Xcode"
echo ""
echo "   Pour Android :"
echo "   npx cap open android"
echo "   # Puis compilez dans Android Studio"
echo ""
echo "🎯 L'icône 'A' rouge et le splash screen 'ANISFLIX' devraient maintenant être visibles !"
echo ""
echo "🔍 Vérifications :"
echo "   - L'icône apparaîtra sur l'écran d'accueil de l'appareil"
echo "   - Le splash screen s'affichera au démarrage de l'app"
echo "   - Les deux utilisent le style Netflix (rouge #E50914 sur fond noir)"
