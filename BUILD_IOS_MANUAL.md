# Build iOS Manuel - AnisFlix

## 📱 Instructions pour Lancer le Build iOS

### **Étape 1 : Connexion EAS**

```bash
# Se connecter à EAS avec votre compte Expo
npx eas-cli@latest login

# Vérifier la connexion
npx eas-cli@latest whoami
```

**Si vous n'avez pas de compte Expo :**
1. Allez sur [expo.dev](https://expo.dev)
2. Créez un compte gratuit
3. Revenez et lancez la commande de connexion

### **Étape 2 : Lancer le Build**

**Option A - Build de Prévisualisation (Recommandé) :**
```bash
npx eas-cli@latest build --platform ios --profile preview
```

**Option B - Build de Production :**
```bash
npx eas-cli@latest build --platform ios --profile production
```

**Option C - Build de Développement :**
```bash
npx eas-cli@latest build --platform ios --profile development
```

### **Étape 3 : Suivre le Progrès**

1. **En ligne** : Allez sur [expo.dev](https://expo.dev) → Vos projets → AnisFlix
2. **Email** : Vous recevrez un email quand le build sera terminé
3. **Terminal** : Le build affichera un lien de suivi

### **Étape 4 : Télécharger l'App**

Une fois le build terminé :
1. Cliquez sur le lien fourni
2. Téléchargez le fichier `.ipa`
3. Installez sur votre iPhone via Xcode ou TestFlight

## 🎯 **Commandes Rapides**

```bash
# Connexion EAS
npx eas-cli@latest login

# Build iOS (Preview)
npx eas-cli@latest build --platform ios --profile preview

# Voir les builds
npx eas-cli@latest build:list

# Voir les détails d'un build
npx eas-cli@latest build:view [BUILD_ID]
```

## 📋 **Checklist Pré-Build**

- [x] ✅ Assets créés (icônes, splash screen)
- [x] ✅ Configuration EAS (eas.json)
- [x] ✅ Configuration app (app.json)
- [x] ✅ Bundle identifier défini (com.anisflix.app)
- [x] ✅ Plugins configurés (expo-router, expo-av)
- [ ] 🔐 Compte EAS configuré
- [ ] 🚀 Build lancé

## 🎉 **Résultat Attendu**

Après le build (10-15 minutes) :
- **Fichier IPA** pour installation iOS
- **Lien de téléchargement** pour les tests
- **Build ID** pour le suivi
- **Email de confirmation**

## 🆘 **Dépannage**

**Erreur de connexion :**
```bash
# Réessayer la connexion
npx eas-cli@latest logout
npx eas-cli@latest login
```

**Erreur de build :**
```bash
# Voir les logs détaillés
npx eas-cli@latest build:view [BUILD_ID]
```

**Assets manquants :**
- Vérifiez que tous les fichiers dans `assets/` existent
- Les icônes sont déjà créées et optimisées

## 📱 **Prochaines Étapes**

1. **Test** : Installez l'app sur votre iPhone
2. **TestFlight** : Soumettez pour les tests beta
3. **App Store** : Soumettez pour la publication

---

**Votre app AnisFlix est prête pour le build iOS !** 🚀
