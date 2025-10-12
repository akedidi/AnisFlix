#!/bin/bash

# Script de déploiement AnisFlix sur Netlify
echo "🚀 Déploiement AnisFlix sur Netlify..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire racine du projet."
    exit 1
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Build du projet
echo "🔨 Build du projet..."
npm run build:netlify

# Vérifier que le build a réussi
if [ ! -d "dist/public" ]; then
    echo "❌ Erreur: Le dossier dist/public n'a pas été créé. Le build a échoué."
    exit 1
fi

echo "✅ Build réussi !"
echo ""
echo "📁 Fichiers prêts pour le déploiement dans: dist/public"
echo ""
echo "🌐 Pour déployer sur Netlify:"
echo "   1. Allez sur https://netlify.com"
echo "   2. Glissez-déposez le dossier 'dist/public' dans la zone de déploiement"
echo "   3. Ou connectez votre repository Git à Netlify"
echo ""
echo "⚙️  N'oubliez pas de configurer les variables d'environnement:"
echo "   - VITE_TMDB_API_KEY"
echo "   - VITE_API_BASE_URL"
echo ""
echo "📖 Consultez DEPLOYMENT.md pour plus de détails"
