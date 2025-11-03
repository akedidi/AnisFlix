#!/bin/bash

# Script de diagnostic Appium pour iOS
# Ce script lance des tests de diagnostic pour identifier les problèmes

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Diagnostic Appium - iOS Native${NC}\n"

# Vérifier qu'Appium est installé
if ! command -v appium &> /dev/null; then
    echo -e "${RED}❌ Appium n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g appium"
    exit 1
fi

# Vérifier que le serveur Appium tourne
if ! curl -s http://localhost:4723/status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Le serveur Appium ne semble pas démarré${NC}"
    echo "Démarrage du serveur Appium..."
    appium > logs/appium-diagnostic.log 2>&1 &
    APPIUM_PID=$!
    echo "Appium démarré avec PID: $APPIUM_PID"
    sleep 5
    
    if ! curl -s http://localhost:4723/status > /dev/null 2>&1; then
        echo -e "${RED}❌ Impossible de démarrer Appium${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Serveur Appium démarré${NC}\n"
else
    echo -e "${GREEN}✅ Serveur Appium déjà démarré${NC}\n"
    APPIUM_PID=""
fi

# Fonction de nettoyage
cleanup() {
    if [ ! -z "$APPIUM_PID" ]; then
        echo -e "\n${YELLOW}Arrêt du serveur Appium...${NC}"
        kill $APPIUM_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Créer les dossiers nécessaires
mkdir -p test-results logs

# Vérifier que l'app existe
IOS_APP_PATH="${IOS_APP_PATH:-}"
if [ -z "$IOS_APP_PATH" ]; then
    POSSIBLE_PATHS=(
        "./ios/App/App.xcarchive/Products/Applications/App.app"
        "$HOME/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app"
    )
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -d "$path" ]; then
            IOS_APP_PATH="$path"
            break
        fi
    done
fi

if [ -z "$IOS_APP_PATH" ] || [ ! -d "$IOS_APP_PATH" ]; then
    echo -e "${YELLOW}⚠️  Application iOS non trouvée${NC}"
    echo "Veuillez construire l'app dans Xcode d'abord:"
    echo "  1. npx cap sync ios"
    echo "  2. npx cap open ios"
    echo "  3. Dans Xcode: Product > Build (⌘B)"
    echo ""
    echo "Ou chercher l'app:"
    echo "  find ~/Library/Developer/Xcode/DerivedData -name 'App.app' -type d | head -1"
    exit 1
fi

echo -e "${GREEN}✅ Application trouvée: ${IOS_APP_PATH}${NC}\n"

# Exporter le chemin de l'app
export IOS_APP_PATH

# Lancer les tests de diagnostic
echo -e "${BLUE}🧪 Lancement des tests de diagnostic...${NC}\n"

npm run test:e2e:diagnostic

# Afficher les résultats
echo -e "\n${BLUE}📊 Résultats du diagnostic:${NC}"
echo -e "${GREEN}✅ Screenshots disponibles dans: test-results/${NC}"
echo -e "${GREEN}✅ Page source disponible dans: test-results/page-source.xml${NC}"
echo -e "${GREEN}✅ Logs disponibles dans: logs/appium-diagnostic.log${NC}"

echo -e "\n${BLUE}📋 Fichiers générés:${NC}"
ls -lh test-results/ | grep -E "\.(png|xml)$" || echo "Aucun fichier trouvé"

echo -e "\n${BLUE}💡 Analyse des résultats:${NC}"
echo "1. Vérifiez les screenshots dans test-results/"
echo "2. Vérifiez le page-source.xml pour voir la structure DOM"
echo "3. Vérifiez les logs dans logs/appium-diagnostic.log"
echo "4. Si les éléments ne sont pas trouvés, vérifiez que l'app est bien construite"
echo "5. Si la tabbar bouge, vérifiez les styles CSS dans le code"

echo -e "\n${GREEN}✅ Diagnostic terminé!${NC}"


