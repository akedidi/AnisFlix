#!/bin/bash

# Script pour démarrer le serveur accessible sur le réseau local
# Garde localhost pour le SDK Chromecast, mais écoute sur toutes les interfaces

echo "🚀 Démarrage du serveur AnisFlix sur le réseau local..."
echo ""
echo "Le serveur sera accessible via :"
echo "  - http://localhost:3000 (pour Chromecast)"

# Obtenir l'IP locale
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
echo "  - http://$LOCAL_IP:3000 (pour d'autres appareils)"
echo ""
echo "⚠️  IMPORTANT pour Chromecast :"
echo "    Utilisez http://localhost:3000 dans votre navigateur"
echo "    Le serveur écoute sur 0.0.0.0 donc il est accessible depuis le réseau"
echo ""

# Démarrer le serveur
npm run dev
