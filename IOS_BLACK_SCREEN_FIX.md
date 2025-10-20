# 🔧 Résolution Écran Noir iOS - AnisFlix

## 🚨 Problème : Écran noir sur simulateur iOS

### ✅ Diagnostic automatique

Exécutez le script de diagnostic :
```bash
node scripts/diagnose-ios-black-screen.cjs
```

### 🔧 Solutions rapides

#### 1. **Reconstruire et synchroniser**
```bash
npm run build
npx cap sync ios
```

#### 2. **Dans Xcode**
- `Product` → `Clean Build Folder` (Cmd+Shift+K)
- Redémarrer le simulateur
- Relancer l'application (Cmd+R)

#### 3. **Vérifier les logs Xcode**
- Ouvrir la console Xcode
- Chercher les erreurs JavaScript
- Vérifier les messages de Capacitor

### 🧪 Version Debug intégrée

L'application inclut maintenant une version de debug qui s'affiche automatiquement sur iOS :

- **Écran noir** → Affiche les informations de diagnostic
- **Informations détaillées** : plateforme, taille écran, DOM
- **Bouton console** pour exporter les logs

### 📱 Tests à effectuer

1. **Lancer l'application** dans Xcode
2. **Si écran noir** → Vérifier les informations de debug
3. **Aller dans Paramètres** → Onglet "Tests"
4. **Lancer les tests** pour vérifier les APIs
5. **Vérifier les logs** dans la console Xcode

### 🔍 Vérifications importantes

#### Configuration valide ✅
- [x] Fichiers build présents (JS/CSS/HTML)
- [x] Synchronisation iOS réussie
- [x] Configuration Capacitor correcte
- [x] Plugins installés
- [x] Info.plist configuré

#### Problèmes courants
1. **Cache Xcode** → Clean Build Folder
2. **Simulateur obsolète** → Mettre à jour iOS
3. **Erreurs JavaScript** → Vérifier console Xcode
4. **Configuration réseau** → Vérifier URL de base

### 🚀 Si tout fonctionne

Une fois l'écran noir résolu :
1. **Retirer la version debug** en modifiant `main.tsx`
2. **Tester les fonctionnalités** : VidMoly, Vidzy, VidSrc
3. **Tester Picture-in-Picture** et AirPlay
4. **Vérifier les APIs** via le panneau de test

### 📞 Support

Si le problème persiste :
1. Exécuter le diagnostic complet
2. Copier les logs Xcode
3. Vérifier la version iOS du simulateur
4. Tester sur un appareil physique si possible

---

**Note** : La version debug est temporaire et sera retirée une fois le problème résolu.
