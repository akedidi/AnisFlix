# 📱 Installation iOS pour AnisFlix

Ce guide explique comment tester l'application AnisFlix sur iPhone avec Xcode.

## ⚠️ Prérequis

- Un Mac avec macOS (Monterey ou plus récent)
- Xcode 14+ installé
- Node.js 18+ installé sur votre Mac
- Un compte Apple Developer (gratuit pour les tests)
- Un iPhone (optionnel, vous pouvez utiliser le simulateur)

---

## 🚀 Installation sur votre Mac

### 1. Télécharger le projet

**Option A - Depuis GitHub** (si configuré) :
```bash
git clone [URL_DU_REPO]
cd anisflix
```

**Option B - Télécharger depuis Replit** :
1. Dans Replit, cliquez sur le menu "..." en haut
2. Sélectionnez "Download as zip"
3. Décompressez sur votre Mac
4. Ouvrez le Terminal et naviguez vers le dossier :
```bash
cd ~/Downloads/anisflix  # Ajustez le chemin
```

---

### 2. Installer les dépendances

```bash
# Installer les packages npm
npm install

# Installer Capacitor CLI globalement (si pas déjà fait)
npm install -g @capacitor/cli

# Vérifier l'installation
npx cap --version
```

---

### 3. Initialiser/Synchroniser iOS

⚠️ **IMPORTANT** : Si le dossier `ios/` téléchargé depuis Replit est incomplet, vous **devez** le supprimer et le recréer.

**Option A - Dossier iOS incomplet ou vide** (RECOMMANDÉ) :
```bash
# Supprimer le dossier iOS existant
rm -rf ios

# Créer un nouveau projet iOS propre
npx cap add ios

# Synchroniser les fichiers web
npx cap sync ios

# Installer les CocoaPods (dépendances natives)
cd ios/App
pod install
cd ../..
```

**Option B - Dossier iOS déjà complet** :
```bash
# Synchroniser seulement
npx cap sync ios

# Installer les pods iOS
cd ios/App
pod install
cd ../..
```

**Vérification** : Le fichier `ios/App/App/Info.plist` doit exister
```bash
ls -la ios/App/App/Info.plist
```

---

### 4. Démarrer le serveur de développement

Dans un terminal, démarrez le serveur :

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

⚠️ **Gardez ce terminal ouvert** pendant les tests !

---

### 5. Ouvrir dans Xcode

Dans un **nouveau terminal** :

```bash
# Ouvrir le projet iOS dans Xcode
npx cap open ios
```

Cela ouvre automatiquement Xcode avec le projet AnisFlix.

---

### 6. Configuration dans Xcode

1. **Sélectionner l'équipe de développement** :
   - Dans Xcode, sélectionnez le projet "App" dans la barre latérale
   - Onglet "Signing & Capabilities"
   - Sous "Team", sélectionnez votre compte Apple Developer
   - Xcode créera automatiquement un profil de provisioning

2. **Choisir la cible** :
   - En haut à gauche de Xcode, à côté du bouton Play
   - Sélectionnez soit :
     - Un simulateur (ex: "iPhone 15 Pro")
     - Votre iPhone connecté via USB

3. **Lancer l'application** :
   - Cliquez sur le bouton Play (▶️) ou `Cmd + R`
   - L'application se compile et s'installe

---

## 🔄 Mode Live Reload (optionnel)

Pour voir vos modifications en temps réel sans recompiler :

```bash
# Terminal 1 : Le serveur doit tourner
npm run dev

# Terminal 2 : Lancer avec live reload
npx cap run ios --livereload --external
```

⚠️ **Important** : Votre Mac et iPhone doivent être sur le même réseau WiFi.

---

## 🧪 Test des fonctionnalités natives

Une fois l'app lancée, testez :

### ✅ IonTabBar
- 6 onglets en bas : Home, Movies, Series, TV, Favorites, Settings
- Icônes et labels traduits selon la langue sélectionnée

### ✅ Pull-to-Refresh
- Sur n'importe quelle page, tirez vers le bas
- Un spinner apparaît avec le texte "Pull to refresh..." ou "Deslizar para actualizar..."
- La page se recharge après 2 secondes

### ✅ Mode Hors Ligne
1. Activez le mode avion sur votre iPhone
2. Les onglets "Movies" et "Series" deviennent désactivés (grisés)
3. Les onglets "Home", "TV", "Favorites", "Settings" restent accessibles
4. Désactivez le mode avion pour restaurer tous les onglets

### ✅ Navigation
- Toutes les pages utilisent l'historique natif iOS (bouton retour <)
- Les animations de transition sont natives

---

## 🐛 Dépannage

### ❌ Erreur : "Info.plist cannot be found"

**Symptôme** : Xcode affiche l'erreur :
```
Build input file cannot be found: '.../ios/App/App/Info.plist'
```

**Cause** : Le dossier iOS téléchargé depuis Replit est incomplet.

**Solution** : Regénérer complètement le projet iOS
```bash
# Supprimer le dossier iOS incomplet
rm -rf ios

# Recréer le projet iOS
npx cap add ios
npx cap sync ios

# Installer les CocoaPods
cd ios/App
pod install
cd ../..

# Vérifier que Info.plist existe
ls -la ios/App/App/Info.plist

# Ouvrir dans Xcode
npx cap open ios
```

### L'app ne se lance pas
```bash
# Nettoyer le cache
cd ios/App
pod deintegrate
pod install
cd ../..
npx cap sync ios
```

### Erreur de signature
- Vérifiez que vous avez sélectionné votre Team dans Xcode
- Essayez de créer un nouveau Bundle Identifier unique

### Le serveur ne répond pas
- Vérifiez que `npm run dev` tourne toujours
- Vérifiez l'URL dans `capacitor.config.ts` : doit être `http://localhost:5000`

### L'app affiche une page blanche
1. Ouvrez Safari sur votre Mac
2. Menu "Develop" → [Votre iPhone] → "App"
3. Consultez la console pour voir les erreurs

---

## 📝 Configuration actuelle

- **App ID** : `com.anisflix.app`
- **App Name** : AnisFlix
- **Serveur Dev** : `http://localhost:5000`
- **Langues supportées** : FR, EN, ES, DE, IT, PT

---

## 🎯 Prochaines étapes

Une fois les tests terminés, vous pourrez :
- Créer un build de production
- Soumettre à TestFlight pour les tests beta
- Publier sur l'App Store

---

## 📚 Ressources

- [Documentation Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Documentation Ionic React](https://ionicframework.com/docs/react)
- [Guide Apple Developer](https://developer.apple.com/documentation/)

---

**Besoin d'aide ?** Consultez les logs dans Xcode ou contactez le support.
