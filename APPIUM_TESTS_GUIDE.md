# 📱 Guide de Tests Appium - AnisFlix

## 🎯 Objectif

Ce guide explique comment utiliser Appium avec WebdriverIO pour tester automatiquement l'interface utilisateur de l'application AnisFlix sur iOS natif.

## 📋 Prérequis

### 1. Installation des dépendances

```bash
# Installer toutes les dépendances (déjà fait)
npm install

# Installer Appium globalement (optionnel mais recommandé)
npm install -g appium

# Installer les drivers Appium
appium driver install xcuitest  # Pour iOS
appium driver install uiautomator2  # Pour Android (optionnel)
```

### 2. Configuration iOS

#### Sur macOS :

1. **Xcode** doit être installé (via App Store)
2. **Xcode Command Line Tools** :
   ```bash
   xcode-select --install
   ```

3. **CocoaPods** (pour les dépendances iOS) :
   ```bash
   sudo gem install cocoapods
   ```

4. **Carthage** (optionnel mais recommandé) :
   ```bash
   brew install carthage
   ```

### 3. Build de l'application iOS

Avant de lancer les tests, vous devez construire l'application :

```bash
# 1. Synchroniser Capacitor
export LANG=en_US.UTF-8
npx cap sync ios

# 2. Ouvrir Xcode
npx cap open ios

# 3. Dans Xcode :
#    - Sélectionner un simulateur (ex: iPhone 15 Pro)
#    - Product > Build (⌘B)
#    - Product > Run (⌘R) pour tester manuellement
```

### 4. Trouver le chemin de l'application

Après le build, vous devez trouver le chemin de l'app :

```bash
# Option 1: Depuis Xcode
# Après un build, le chemin est généralement :
# ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app

# Option 2: Chercher l'app
find ~/Library/Developer/Xcode/DerivedData -name "App.app" -type d | head -1

# Option 3: Utiliser le chemin relatif (si vous avez un .xcarchive)
# ./ios/App/App.xcarchive/Products/Applications/App.app
```

## 🚀 Utilisation

### 1. Démarrer Appium Server

Dans un terminal séparé :

```bash
npm run appium:start
# ou
appium
```

Le serveur Appium démarrera sur `http://localhost:4723`

### 2. Lancer les tests

#### Tous les tests :
```bash
npm run test:e2e
```

#### Tests spécifiques :
```bash
# Tests de navigation avec animations
npm run test:e2e:navigation

# Tests du header et safe area
npm run test:e2e:header

# Tests du pull to refresh
npm run test:e2e:refresh

# Tests de la tabbar et du scroll
npm run test:e2e:tabbar
```

### 3. Configuration du chemin de l'app

Si votre app n'est pas au chemin par défaut, vous pouvez :

**Option A**: Modifier `wdio.conf.ts` :
```typescript
'appium:app': '/chemin/vers/votre/App.app'
```

**Option B**: Utiliser une variable d'environnement :
```bash
export IOS_APP_PATH="/chemin/vers/votre/App.app"
npm run test:e2e
```

## 📊 Tests disponibles

### 1. Navigation Animations (`navigation-animations.spec.ts`)

- ✅ Navigation vers détail avec animation push
- ✅ Retour avec animation pop
- ✅ Swipe back gesture
- ✅ Historique de navigation

### 2. Header Safe Area (`header-safe-area.spec.ts`)

- ✅ Position du header sous l'encoche
- ✅ Header sticky pendant le scroll
- ✅ Padding safe area correct
- ✅ Status bar visible au-dessus du header

### 3. Pull to Refresh (`pull-to-refresh.spec.ts`)

- ✅ Déclenchement du pull to refresh
- ✅ Rafraîchissement du contenu
- ✅ Affichage du spinner
- ✅ Disponibilité uniquement sur natif

### 4. TabBar et Scroll (`tabbar-scroll.spec.ts`)

- ✅ TabBar fixe en bas
- ✅ Padding safe area pour tabbar
- ✅ TabBar reste visible pendant le scroll
- ✅ Navigation entre onglets
- ✅ Scroll fonctionnel
- ✅ Contenu non caché par la tabbar

## 📸 Screenshots

Les tests prennent automatiquement des screenshots dans `test-results/` :

- `navigation-push-animation.png`
- `navigation-pop-animation.png`
- `swipe-back-gesture.png`
- `header-safe-area.png`
- `header-sticky-scroll.png`
- `pull-to-refresh-before.png`
- `pull-to-refresh-during.png`
- `pull-to-refresh-after.png`
- `tabbar-bottom-position.png`
- `tabbar-safe-area.png`
- `tabbar-scroll-fixed.png`
- Et plus...

## 🐛 Dépannage

### Problème : Appium ne trouve pas l'app

**Solution** :
1. Vérifier que le build iOS a réussi dans Xcode
2. Vérifier le chemin de l'app dans `wdio.conf.ts`
3. Utiliser le chemin absolu au lieu du chemin relatif

```typescript
'appium:app': process.env.IOS_APP_PATH || '/Users/votre-username/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app'
```

### Problème : Simulateur ne démarre pas

**Solution** :
1. Ouvrir Xcode manuellement
2. Démarrer le simulateur manuellement : `xcrun simctl boot "iPhone 15 Pro"`
3. Vérifier que le simulateur est disponible : `xcrun simctl list devices`

### Problème : Tests échouent avec timeout

**Solution** :
1. Augmenter les timeouts dans `wdio.conf.ts` :
   ```typescript
   waitforTimeout: 20000, // Au lieu de 10000
   connectionRetryTimeout: 180000, // Au lieu de 120000
   ```

2. Vérifier que l'app démarre correctement manuellement dans Xcode

### Problème : WebDriverAgent ne se construit pas

**Solution** :
1. Ouvrir Xcode
2. Ouvrir `~/Library/Developer/Xcode/DerivedData/WebDriverAgent-*/SourcePackages/checkouts/WebDriverAgent/WebDriverAgent.xcodeproj`
3. Sélectionner votre équipe de développement
4. Build le projet (⌘B)
5. Relancer les tests

### Problème : Tests trouvent des éléments mais les assertions échouent

**Solution** :
1. Vérifier les screenshots dans `test-results/`
2. Augmenter les délais (`driver.pause()`) dans les tests
3. Vérifier que les sélecteurs correspondent aux éléments réels de l'UI

## 🔧 Configuration avancée

### Utiliser un simulateur spécifique

Modifier `wdio.conf.ts` :

```typescript
'appium:deviceName': 'iPhone 15 Pro',
'appium:platformVersion': '17.0',
'appium:udid': 'SIMULATOR_UDID', // Optionnel, pour un simulateur spécifique
```

### Utiliser un appareil physique

1. Connecter l'appareil via USB
2. Faire confiance à l'ordinateur sur l'appareil
3. Dans Xcode : Window > Devices and Simulators
4. Sélectionner l'appareil et cliquer sur "Use for Development"
5. Modifier `wdio.conf.ts` :
   ```typescript
   'appium:udid': 'UDID_DE_VOTRE_APPAREIL',
   'appium:deviceName': 'iPhone de Anis',
   ```

### Tests en parallèle

Modifier `wdio.conf.ts` :

```typescript
maxInstances: 3, // Au lieu de 1
```

Et créer plusieurs capabilities pour différents simulateurs.

## 📚 Ressources

- [Appium Documentation](http://appium.io/docs/)
- [WebdriverIO Documentation](https://webdriver.io/)
- [XCUITest Driver](https://github.com/appium/appium-xcuitest-driver)
- [UI Automator2 Driver](https://github.com/appium/appium-uiautomator2-driver)

## ✅ Checklist avant de lancer les tests

- [ ] Appium installé globalement
- [ ] Xcode installé et configuré
- [ ] Application iOS construite dans Xcode
- [ ] Simulateur iOS disponible
- [ ] Chemin de l'app correct dans `wdio.conf.ts`
- [ ] Serveur Appium démarré (`npm run appium:start`)
- [ ] Tests lancés (`npm run test:e2e`)

## 🎯 Résultats attendus

Après avoir lancé tous les tests, vous devriez voir :

```
✅ Navigation Animations Tests
  ✅ should navigate to movie detail with push animation
  ✅ should navigate back with pop animation
  ✅ should support swipe back gesture
  ✅ should maintain navigation history

✅ Header Safe Area Tests
  ✅ should position header under the notch/Dynamic Island
  ✅ should keep header sticky during scroll
  ✅ should have correct safe area padding
  ✅ should show status bar above header

✅ Pull to Refresh Tests
  ✅ should trigger pull to refresh when swiping down
  ✅ should refresh content after pull to refresh
  ✅ should show refresh spinner during pull
  ✅ should only work on native platform

✅ TabBar and Scroll Tests
  ✅ should have tabbar fixed at bottom
  ✅ should have safe area padding for tabbar
  ✅ should keep tabbar visible during scroll
  ✅ should navigate between tabs
  ✅ should scroll content correctly
  ✅ should not hide content behind tabbar
```

Si certains tests échouent, vérifier les screenshots dans `test-results/` pour diagnostiquer le problème !


