# 🧪 Tests Appium - AnisFlix

## 🚀 Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
npm install -g appium
appium driver install xcuitest
```

### 2. Construire l'application iOS
```bash
export LANG=en_US.UTF-8
npx cap sync ios
npx cap open ios
# Dans Xcode: Product > Build (⌘B)
```

### 3. Trouver le chemin de l'app
```bash
# Après le build, chercher l'app:
find ~/Library/Developer/Xcode/DerivedData -name "App.app" -type d | head -1

# Ou utiliser le chemin par défaut si vous avez un .xcarchive:
# ./ios/App/App.xcarchive/Products/Applications/App.app
```

### 4. Configurer le chemin dans wdio.conf.ts
Modifier la ligne `'appium:app'` avec le chemin trouvé.

### 5. Lancer les tests
```bash
# Option A: Script helper (recommandé)
./scripts/run-appium-tests.sh [all|navigation|header|refresh|tabbar]

# Option B: NPM scripts
npm run appium:start  # Dans un terminal séparé
npm run test:e2e      # Dans un autre terminal

# Tests spécifiques:
npm run test:e2e:navigation  # Tests de navigation
npm run test:e2e:header      # Tests du header
npm run test:e2e:refresh     # Tests pull to refresh
npm run test:e2e:tabbar      # Tests tabbar et scroll
```

## 📊 Tests disponibles

| Suite | Fichier | Description |
|-------|---------|------------|
| **Navigation** | `navigation-animations.spec.ts` | Animations push/pop, swipe back |
| **Header** | `header-safe-area.spec.ts` | Position sous encoche, sticky |
| **Pull to Refresh** | `pull-to-refresh.spec.ts` | Déclenchement et rafraîchissement |
| **TabBar & Scroll** | `tabbar-scroll.spec.ts` | Position fixe, safe area, navigation |

## 📸 Résultats

- **Screenshots**: `test-results/*.png`
- **Logs**: `logs/appium.log`
- **Rapports JSON**: `test-results/results-*.json`

## 🐛 Dépannage

### Appium ne démarre pas
```bash
# Vérifier le port
lsof -i :4723

# Tuer le processus si nécessaire
kill -9 $(lsof -t -i:4723)

# Relancer
npm run appium:start
```

### Tests échouent avec timeout
- Augmenter les timeouts dans `wdio.conf.ts`
- Vérifier que l'app démarre correctement dans Xcode
- Vérifier les screenshots dans `test-results/`

### Simulateur ne démarre pas
```bash
# Lister les simulateurs disponibles
xcrun simctl list devices

# Démarrer un simulateur spécifique
xcrun simctl boot "iPhone 15 Pro"
```

## 📚 Documentation complète

Voir [`APPIUM_TESTS_GUIDE.md`](./APPIUM_TESTS_GUIDE.md) pour la documentation complète.

## ✅ Checklist

- [ ] Appium installé (`npm install -g appium`)
- [ ] Driver XCUITest installé (`appium driver install xcuitest`)
- [ ] Xcode installé et configuré
- [ ] Application iOS construite dans Xcode
- [ ] Chemin de l'app configuré dans `wdio.conf.ts`
- [ ] Serveur Appium démarré (`npm run appium:start`)
- [ ] Tests lancés (`npm run test:e2e`)

## 🎯 Objectif

Ces tests automatisés permettent de vérifier automatiquement que :
- ✅ Les animations de navigation fonctionnent (push/pop/swipe back)
- ✅ Le header est positionné sous l'encoche iOS
- ✅ Le header reste sticky pendant le scroll
- ✅ Le pull to refresh fonctionne
- ✅ La tabbar est fixe en bas avec safe area
- ✅ Le scroll fonctionne correctement
- ✅ Le contenu n'est pas caché par le header ou la tabbar

Ces tests fournissent des screenshots et des rapports détaillés pour diagnostiquer les problèmes de l'UI native.

