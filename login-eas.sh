#!/bin/bash

echo "🔐 Connexion EAS pour AnisFlix"
echo "=============================="

# Se connecter à EAS avec les identifiants fournis
echo "📧 Email: kedidi.anis@gmail.com"
echo "🎯 Projet: anisflix"

# Tenter la connexion
echo "🚀 Tentative de connexion EAS..."
npx eas-cli@latest login --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ Connexion EAS réussie !"
    echo ""
    echo "📱 Vérification du compte :"
    npx eas-cli@latest whoami
    echo ""
    echo "🎯 Projets disponibles :"
    npx eas-cli@latest project:list
    echo ""
    echo "🚀 Prêt pour le build iOS !"
    echo "   Lancez: npx eas-cli@latest build --platform ios --profile preview"
else
    echo "❌ Échec de la connexion EAS"
    echo "💡 Essayez manuellement :"
    echo "   npx eas-cli@latest login"
fi
