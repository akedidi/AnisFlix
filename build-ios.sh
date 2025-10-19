#!/bin/bash

# Script de Build iOS pour AnisFlix
echo "📱 Build iOS - AnisFlix"
echo "======================"

# Vérifier si EAS CLI est installé
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI non trouvé. Installation..."
    npm install -g @expo/cli eas-cli
fi

# Vérifier la connexion EAS
echo "🔐 Vérification de la connexion EAS..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Non connecté à EAS. Veuillez vous connecter :"
    echo "   eas login"
    exit 1
fi

# Vérifier les assets
echo "🖼️  Vérification des assets..."
required_assets=("assets/icon.png" "assets/splash.png" "assets/adaptive-icon.png" "assets/tv-icon.png" "assets/favicon.png")

for asset in "${required_assets[@]}"; do
    if [ ! -f "$asset" ]; then
        echo "❌ Asset manquant: $asset"
        echo "   Veuillez créer cette image avant de continuer."
        exit 1
    fi
done

echo "✅ Tous les assets sont présents"

# Lancer le build
echo "🚀 Lancement du build iOS..."
echo ""

# Demander le profil de build
echo "Choisissez le profil de build :"
echo "1) Development (pour le développement)"
echo "2) Preview (pour les tests)"
echo "3) Production (pour l'App Store)"
echo ""

read -p "Votre choix (1-3): " choice

case $choice in
    1)
        profile="development"
        echo "📱 Build Development sélectionné"
        ;;
    2)
        profile="preview"
        echo "📱 Build Preview sélectionné"
        ;;
    3)
        profile="production"
        echo "📱 Build Production sélectionné"
        ;;
    *)
        echo "❌ Choix invalide. Utilisation du profil preview par défaut."
        profile="preview"
        ;;
esac

echo ""
echo "🚀 Lancement du build iOS avec le profil: $profile"
echo ""

# Lancer le build
eas build --platform ios --profile $profile

echo ""
echo "🎉 Build lancé !"
echo "📱 Vous pouvez suivre le progrès sur: https://expo.dev"
echo "📧 Vous recevrez un email quand le build sera terminé."
