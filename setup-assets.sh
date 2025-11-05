#!/bin/bash

echo "🎨 Configuration des assets ANISFLIX"
echo "=================================="

# Créer le dossier assets s'il n'existe pas
mkdir -p assets

echo "📱 Instructions pour configurer l'icône et le splash screen :"
echo ""
echo "1. Ouvrez le fichier generate-assets.html dans votre navigateur :"
echo "   open generate-assets.html"
echo ""
echo "2. Faites un clic droit sur l'icône et enregistrez-la comme 'icon.png'"
echo "3. Faites un clic droit sur le splash screen et enregistrez-le comme 'splash.png'"
echo "4. Placez les deux fichiers dans le dossier assets/"
echo ""
echo "5. Une fois les fichiers en place, exécutez :"
echo "   npx cap sync"
echo ""
echo "6. Pour iOS, ouvrez Xcode et compilez :"
echo "   npx cap open ios"
echo ""
echo "7. Pour Android, ouvrez Android Studio et compilez :"
echo "   npx cap open android"
echo ""

# Vérifier si les fichiers existent
if [ -f "assets/icon.png" ]; then
    echo "✅ Icône trouvée : assets/icon.png"
else
    echo "❌ Icône manquante : assets/icon.png"
fi

if [ -f "assets/splash.png" ]; then
    echo "✅ Splash screen trouvé : assets/splash.png"
else
    echo "❌ Splash screen manquant : assets/splash.png"
fi

echo ""
echo "🔧 Configuration Capacitor Assets :"
echo "Le fichier assets.config.json est configuré pour :"
echo "- iOS : icône 1024x1024, splash 2732x2732"
echo "- Android : icône 1024x1024, splash 2732x2732"
