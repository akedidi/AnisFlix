#!/bin/bash

echo "🎨 Configuration des assets ANISFLIX"
echo "=================================="

# Créer le dossier assets s'il n'existe pas
mkdir -p assets

echo "📱 Étapes pour configurer l'icône et le splash screen :"
echo ""
echo "1. Ouvrez le fichier create-assets.html dans votre navigateur :"
echo "   open create-assets.html"
echo ""
echo "2. Cliquez sur 'Télécharger icon.png' et sauvegardez dans assets/"
echo "3. Cliquez sur 'Télécharger splash.png' et sauvegardez dans assets/"
echo ""
echo "4. Une fois les fichiers téléchargés, exécutez :"
echo "   ./update-app-assets.sh"
echo ""

# Vérifier si les fichiers existent
if [ -f "assets/icon.png" ]; then
    echo "✅ Icône trouvée : assets/icon.png"
    ICON_SIZE=$(file assets/icon.png | grep -o '[0-9]*x[0-9]*')
    echo "   Taille : $ICON_SIZE"
else
    echo "❌ Icône manquante : assets/icon.png"
fi

if [ -f "assets/splash.png" ]; then
    echo "✅ Splash screen trouvé : assets/splash.png"
    SPLASH_SIZE=$(file assets/splash.png | grep -o '[0-9]*x[0-9]*')
    echo "   Taille : $SPLASH_SIZE"
else
    echo "❌ Splash screen manquant : assets/splash.png"
fi

echo ""
echo "🔧 Configuration Capacitor Assets :"
echo "Le fichier assets.config.json est configuré pour :"
echo "- iOS : icône 1024x1024, splash 2732x2732"
echo "- Android : icône 1024x1024, splash 2732x2732"
echo ""
echo "📱 Une fois les assets téléchargés, l'app native aura :"
echo "- L'icône 'A' rouge stylisée sur l'écran d'accueil"
echo "- Le splash screen 'ANISFLIX' au démarrage"
