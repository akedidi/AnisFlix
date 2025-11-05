#!/bin/bash

# Script pour lancer les serveurs de développement
echo "🚀 Démarrage des serveurs AnisFlix..."

# Fonction pour nettoyer les processus à la sortie
cleanup() {
    echo "🛑 Arrêt des serveurs..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

# Lancer le serveur backend
echo "📡 Démarrage du serveur backend (port 3000)..."
npm run dev &
BACKEND_PID=$!

# Attendre un peu que le backend démarre
sleep 2

# Lancer le serveur frontend
echo "🌐 Démarrage du serveur frontend (port 5173)..."
npx vite --host &
FRONTEND_PID=$!

echo "✅ Serveurs démarrés !"
echo "📡 Backend: http://localhost:3000"
echo "🌐 Frontend: http://localhost:5173"
echo "📱 App mobile: http://192.168.0.117:5173"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

# Attendre que les processus se terminent
wait
