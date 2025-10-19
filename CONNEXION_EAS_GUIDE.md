# Guide Connexion EAS - AnisFlix

## 🔐 **Votre Compte EAS**

**Email :** kedidi.anis@gmail.com  
**Projet :** anisflix  
**Status :** Non connecté actuellement

## 📝 **Instructions de Connexion**

### **Étape 1 : Connexion EAS**

Dans votre terminal local, exécutez :

```bash
# Se connecter à EAS
npx eas-cli@latest login

# Quand demandé, entrez :
# Email: kedidi.anis@gmail.com
# Mot de passe: [votre mot de passe]
```

### **Étape 2 : Vérification**

```bash
# Vérifier la connexion
npx eas-cli@latest whoami

# Vérifier vos projets
npx eas-cli@latest project:list
```

### **Étape 3 : Build iOS**

Une fois connecté :

```bash
# Build iOS Preview (recommandé pour les tests)
npx eas-cli@latest build --platform ios --profile preview

# Build iOS Production (pour l'App Store)
npx eas-cli@latest build --platform ios --profile production
```

## 🎯 **Votre Projet AnisFlix**

**Configuration actuelle :**
- ✅ Bundle ID : `com.anisflix.app`
- ✅ Assets : Icônes professionnelles créées
- ✅ Configuration EAS : Complète
- ✅ Plugins : expo-router, expo-av configurés

## 🚀 **Commandes Rapides**

```bash
# Connexion
npx eas-cli@latest login

# Vérification
npx eas-cli@latest whoami

# Build iOS
npx eas-cli@latest build --platform ios --profile preview

# Suivre les builds
npx eas-cli@latest build:list
```

## 📱 **Résultat Attendu**

Après le build (10-15 minutes) :
- **Email** de confirmation
- **Lien** de téléchargement IPA
- **App** prête pour iOS

## 🆘 **Dépannage**

**Si la connexion échoue :**
```bash
# Réessayer
npx eas-cli@latest logout
npx eas-cli@latest login
```

**Si le projet n'est pas trouvé :**
- Vérifiez que vous êtes sur le bon compte
- Le projet "anisflix" devrait apparaître dans `project:list`

---

**Votre projet est prêt ! Connectez-vous simplement avec votre compte EAS.** 🚀
