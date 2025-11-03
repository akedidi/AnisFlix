#!/bin/bash

# Script helper pour lancer les tests Appium
# Usage: ./scripts/run-appium-tests.sh [options]

set -e

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AnisFlix Appium Tests Runner${NC}\n"

# Vérifier qu'Appium est installé
if ! command -v appium &> /dev/null; then
    echo -e "${RED}❌ Appium n'est pas installé${NC}"
    echo "Installez-le avec: npm install -g appium"
    exit 1
fi

# Vérifier que Xcode est installé (sur macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v xcodebuild &> /dev/null; then
        echo -e "${RED}❌ Xcode n'est pas installé${NC}"
        exit 1
    fi
fi

# Vérifier que l'app iOS existe
IOS_APP_PATH="${IOS_APP_PATH:-}"
if [ -z "$IOS_APP_PATH" ]; then
    # Chercher l'app dans les emplacements courants
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
    echo "Ou définir IOS_APP_PATH manuellement:"
    echo "  export IOS_APP_PATH=/chemin/vers/App.app"
    exit 1
fi

echo -e "${GREEN}✅ Application trouvée: ${IOS_APP_PATH}${NC}\n"

# Vérifier qu'Appium server tourne
if ! curl -s http://localhost:4723/status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Le serveur Appium ne semble pas démarré${NC}"
    echo "Démarrage du serveur Appium en arrière-plan..."
    appium > logs/appium.log 2>&1 &
    APPIUM_PID=$!
    echo "Appium démarré avec PID: $APPIUM_PID"
    sleep 3
    
    # Vérifier qu'il a bien démarré
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

# Exporter le chemin de l'app
export IOS_APP_PATH

# Lancer les tests
TEST_TYPE="${1:-all}"

case "$TEST_TYPE" in
    all)
        echo -e "${GREEN}🧪 Lancement de tous les tests...${NC}\n"
        npm run test:e2e
        ;;
    navigation)
        echo -e "${GREEN}🧪 Tests de navigation...${NC}\n"
        npm run test:e2e:navigation
        ;;
    header)
        echo -e "${GREEN}🧪 Tests du header...${NC}\n"
        npm run test:e2e:header
        ;;
    refresh)
        echo -e "${GREEN}🧪 Tests du pull to refresh...${NC}\n"
        npm run test:e2e:refresh
        ;;
    tabbar)
        echo -e "${GREEN}🧪 Tests de la tabbar...${NC}\n"
        npm run test:e2e:tabbar
        ;;
    *)
        echo -e "${RED}❌ Type de test inconnu: $TEST_TYPE${NC}"
        echo "Usage: $0 [all|navigation|header|refresh|tabbar]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ Tests terminés!${NC}"
echo "📸 Screenshots disponibles dans: test-results/"
echo "📊 Logs disponibles dans: logs/"


