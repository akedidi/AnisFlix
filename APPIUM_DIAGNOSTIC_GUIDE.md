# 🔍 Guide de Diagnostic Appium - Résolution des Problèmes

## 🚨 Problèmes courants et solutions

### 1. **Appium ne démarre pas**

**Symptômes** :
```
❌ Could not connect to Appium server
```

**Solutions** :
```bash
# Vérifier que le port 4723 est libre
lsof -i :4723

# Tuer le processus si nécessaire
kill -9 $(lsof -t -i:4723)

# Relancer Appium
npm run appium:start
```

### 2. **L'app n'est pas trouvée**

**Solutions** :

**Option A**: Trouver le chemin de l'app
```bash
find ~/Library/Developer/Xcode/DerivedData -name "App.app" -type d | head -1
```

**Option B**: Construire l'app dans Xcode
```bash
npx cap sync ios
npx cap open ios
# Dans Xcode: Product > Build (⌘B)
```

### 3. **Les éléments ne sont pas trouvés**

**Vérifier le page source** :
```bash
cat test-results/page-source.xml | grep -i "ion-tab-bar"
```

## 🔧 Commandes de diagnostic

### Test de diagnostic complet
```bash
./scripts/run-diagnostic.sh
# ou
npm run test:e2e:diagnostic
```

### Vérifier le serveur Appium
```bash
curl http://localhost:4723/status
```

## 📊 Interprétation des résultats

### Screenshots générés
- `01-app-loaded.png` - Vérifier que l'app est chargée
- `02-ion-tabbar-found.png` - Vérifier que la tabbar est visible
- `03-searchbar-found.png` - Vérifier que la searchbar est visible
- `04-tabbar-position.png` - Vérifier la position de la tabbar
- `05-header-position.png` - Vérifier la position du header
- `06-tabbar-after-scroll.png` - Vérifier si la tabbar bouge

### Page source XML
- Chercher `<ion-tab-bar>` pour voir la structure
- Chercher `search-bar` pour voir la searchbar
- Chercher `native-mobile` pour voir si la classe est appliquée



