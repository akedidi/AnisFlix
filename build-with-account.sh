#!/bin/bash

echo "📱 Build iOS AnisFlix avec compte EAS"
echo "====================================="

echo "🔐 Compte EAS: kedidi.anis@gmail.com"
echo "🎯 Projet: anisflix"
echo ""

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "app.json" ]; then
    echo "❌ Erreur: app.json non trouvé. Assurez-vous d'être dans le répertoire AnisFlix"
    exit 1
fi

echo "✅ Répertoire AnisFlix détecté"
echo ""

# Vérifier les assets
echo "🖼️  Vérification des assets..."
if [ -f "assets/icon.png" ] && [ -f "assets/splash.png" ]; then
    echo "✅ Assets présents"
else
    echo "❌ Assets manquants"
    exit 1
fi

echo ""
echo "🚀 Tentative de build iOS..."
echo "   Profil: preview (recommandé pour les tests)"
echo ""

# Lancer le build
npx eas-cli@latest build --platform ios --profile preview --non-interactive

echo ""
if [ $? -eq 0 ]; then
    echo "🎉 Build iOS lancé avec succès !"
    echo "📧 Vous recevrez un email quand le build sera terminé"
    echo "📱 Suivez le progrès sur: https://expo.dev"
else
    echo "❌ Échec du build"
    echo "💡 Assurez-vous d'être connecté à EAS:"
    echo "   npx eas-cli@latest login"
fi
