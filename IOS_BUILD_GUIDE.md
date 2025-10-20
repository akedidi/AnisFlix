# Guide de Génération iOS - AnisFlix

## 📱 Étapes pour Générer l'App iOS

### 1. **Préparation du Projet**

✅ **Configuration terminée :**
- `app.json` configuré avec le bundle identifier `com.anisflix.app`
- `eas.json` configuré avec les profils de build
- Assets temporaires créés
- Dépendances Expo mises à jour

### 2. **Connexion EAS (Requis)**

```bash
# Se connecter à EAS (vous devez avoir un compte Expo)
npx eas-cli@latest login

# Vérifier la connexion
npx eas-cli@latest whoami
```

### 3. **Créer le Projet EAS**

```bash
# Initialiser le projet EAS (si pas encore fait)
npx eas-cli@latest project:init

# Ou créer directement un build
npx eas-cli@latest build:ios --platform ios
```

### 4. **Profils de Build Disponibles**

- **Development** : Pour le développement local
- **Preview** : Pour les tests internes
- **Production** : Pour l'App Store

### 5. **Commandes de Build**

```bash
# Build de développement
npx eas-cli@latest build:ios --profile development

# Build de prévisualisation
npx eas-cli@latest build:ios --profile preview

# Build de production
npx eas-cli@latest build:ios --profile production
```

### 6. **Assets Requis**

⚠️ **Important** : Remplacez les assets temporaires par de vraies images :

- `assets/icon.png` (1024x1024px)
- `assets/splash.png` (1284x2778px)
- `assets/adaptive-icon.png` (1024x1024px)
- `assets/tv-icon.png` (512x512px)
- `assets/favicon.png` (32x32px)

### 7. **Configuration iOS Spécifique**

Le `app.json` est configuré avec :
```json
{
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.anisflix.app"
  }
}
```

### 8. **Permissions iOS**

L'app demande les permissions suivantes :
- Internet (pour les API)
- Accès réseau (pour le streaming)

### 9. **Plugins Configurés**

- `expo-router` : Navigation
- `expo-av` : Lecture vidéo avec Picture-in-Picture

### 10. **Prochaines Étapes**

1. **Connectez-vous à EAS** avec votre compte Expo
2. **Remplacez les assets** par de vraies images
3. **Lancez le build** avec `npx eas-cli@latest build:ios`
4. **Testez l'app** sur un simulateur iOS
5. **Soumettez à l'App Store** si prêt

## 🚀 Commandes Rapides

```bash
# Build complet iOS
npx eas-cli@latest build:ios --profile production

# Build pour test
npx eas-cli@latest build:ios --profile preview

# Voir les builds en cours
npx eas-cli@latest build:list
```

## 📋 Checklist Pré-Build

- [ ] Compte EAS configuré
- [ ] Assets images remplacés
- [ ] Bundle identifier unique
- [ ] Permissions iOS configurées
- [ ] Plugins installés
- [ ] Tests locaux OK

## 🎯 Résultat Attendu

Une fois le build terminé, vous obtiendrez :
- **IPA file** pour l'installation
- **Lien de téléchargement** pour les tests
- **Build ID** pour le suivi

L'app sera prête pour l'installation sur iOS ou la soumission à l'App Store !
