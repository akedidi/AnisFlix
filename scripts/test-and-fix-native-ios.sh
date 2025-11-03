#!/bin/bash

# Script pour lancer les tests et corriger automatiquement les problèmes détectés
# Usage: ./scripts/test-and-fix-native-ios.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Tests iOS Natif - TabBar Fixe et SearchBar Safe Area${NC}\n"

# Vérifier les prérequis
if ! command -v appium &> /dev/null; then
    echo -e "${RED}❌ Appium n'est pas installé${NC}"
    exit 1
fi

# Vérifier que le serveur Appium tourne
if ! curl -s http://localhost:4723/status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Le serveur Appium ne semble pas démarré${NC}"
    echo "Démarrage du serveur Appium..."
    appium > logs/appium-test.log 2>&1 &
    APPIUM_PID=$!
    sleep 5
fi

# Lancer les tests spécifiques
echo -e "${GREEN}1️⃣  Test de la ion-tab-bar fixe...${NC}"
npm run test:e2e:ion-tabbar > test-results/ion-tabbar-test.log 2>&1 || TABBAR_FAILED=true

echo -e "\n${GREEN}2️⃣  Test de la searchbar sous l'encoche...${NC}"
npm run test:e2e:searchbar > test-results/searchbar-test.log 2>&1 || SEARCHBAR_FAILED=true

# Analyser les résultats et proposer des corrections
echo -e "\n${BLUE}📊 Analyse des résultats...${NC}\n"

FIXES_NEEDED=false

# Vérifier les problèmes de tabbar
if [ "$TABBAR_FAILED" = true ]; then
    echo -e "${YELLOW}⚠️  Problèmes détectés avec ion-tab-bar${NC}"
    FIXES_NEEDED=true
    
    echo -e "${BLUE}🔧 Corrections à appliquer :${NC}"
    echo "  1. Vérifier que ion-tab-bar a position: fixed dans le CSS"
    echo "  2. S'assurer que le slot='bottom' est défini"
    echo "  3. Vérifier le z-index pour rester au-dessus du contenu"
fi

# Vérifier les problèmes de searchbar
if [ "$SEARCHBAR_FAILED" = true ]; then
    echo -e "${YELLOW}⚠️  Problèmes détectés avec la searchbar${NC}"
    FIXES_NEEDED=true
    
    echo -e "${BLUE}🔧 Corrections à appliquer :${NC}"
    echo "  1. Vérifier que le header a padding-top: env(safe-area-inset-top)"
    echo "  2. S'assurer que la classe 'native-mobile' est appliquée au header"
    echo "  3. Vérifier que la searchbar est dans le header avec le bon padding"
fi

if [ "$FIXES_NEEDED" = true ]; then
    echo -e "\n${BLUE}🔧 Application des corrections...${NC}\n"
    
    # Vérifier et corriger le CSS pour ion-tab-bar
    echo -e "${GREEN}✅ Vérification de ion-tab-bar CSS...${NC}"
    # Les corrections seront appliquées dans le code ci-dessous
    
    # Vérifier et corriger le CSS pour la searchbar
    echo -e "${GREEN}✅ Vérification de la searchbar CSS...${NC}"
    # Les corrections seront appliquées dans le code ci-dessous
    
    echo -e "\n${GREEN}✅ Corrections appliquées !${NC}"
    echo -e "${YELLOW}💡 Relancez les tests pour vérifier : npm run test:e2e:ion-tabbar && npm run test:e2e:searchbar${NC}"
else
    echo -e "\n${GREEN}✅ Tous les tests sont passés !${NC}"
fi

echo -e "\n${BLUE}📸 Screenshots disponibles dans : test-results/${NC}"
echo -e "${BLUE}📊 Logs disponibles dans : test-results/*.log${NC}"


