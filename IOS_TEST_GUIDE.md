# Guide de Test iOS - AnisFlix

## 🎯 Tests à effectuer dans Xcode/iOS Simulator

### 1. **Configuration de Base**
- [ ] L'application se lance sans erreur
- [ ] Le splash screen s'affiche correctement
- [ ] La barre de statut est configurée (mode sombre)
- [ ] L'interface s'adapte au mode sombre natif

### 2. **Navigation et Interface**
- [ ] Navigation entre les onglets fonctionne
- [ ] Scroll et gestes tactiles fonctionnent
- [ ] Les boutons et interactions répondent
- [ ] L'interface s'adapte aux différentes tailles d'écran

### 3. **APIs et Réseau**
- [ ] **VidMoly** : Test d'extraction de lien m3u8
  - Aller sur un film avec source VidMoly
  - Vérifier que l'extraction fonctionne
  - Vérifier que le lecteur se lance
  
- [ ] **Vidzy** : Test d'extraction Vidzy
  - Aller sur un film avec source Vidzy
  - Vérifier la désobfuscation
  - Vérifier l'extraction m3u8
  
- [ ] **VidSrc** : Test VidSrc
  - Aller sur un film avec source VidSrc
  - Vérifier l'extraction des liens
  - Vérifier le streaming

### 4. **Lecteur Vidéo iOS**
- [ ] **HLS Natif** : Vérifier que les vidéos .m3u8 se lisent avec le lecteur natif
- [ ] **Picture-in-Picture** : Tester le mode PiP
- [ ] **AirPlay** : Tester la diffusion AirPlay
- [ ] **Contrôles natifs** : Vérifier les contrôles iOS natifs
- [ ] **Orientation** : Tester le passage en mode paysage

### 5. **Fonctionnalités Avancées**
- [ ] **Sauvegarde de progression** : Vérifier que la progression se sauvegarde
- [ ] **Mode hors ligne** : Tester le comportement hors ligne
- [ ] **Notifications** : Vérifier les notifications (si configurées)

## 🔧 Tests Techniques

### Console Logs à Vérifier
1. **Détection de plateforme** :
   ```
   Platform: ios
   isNative: true
   isCapacitor: true
   ```

2. **APIs** :
   ```
   API Request: POST /api/vidmoly-test
   API Response: 200 OK
   ```

3. **Lecteur vidéo** :
   ```
   Video player initialized
   HLS source loaded
   ```

### Erreurs à Surveiller
- ❌ Erreurs de réseau (CORS, timeout)
- ❌ Erreurs de lecture vidéo
- ❌ Erreurs de détection de plateforme
- ❌ Erreurs d'extraction API

## 📱 Instructions de Test

1. **Ouvrir dans Xcode** : `npx cap open ios`
2. **Sélectionner un simulateur** : iPhone 15 Pro ou iPad
3. **Lancer l'application** : Cmd+R
4. **Tester les fonctionnalités** selon la liste ci-dessus
5. **Vérifier les logs** dans la console Xcode

## 🚨 Problèmes Potentiels

### Si VidMoly ne fonctionne pas :
- Vérifier que l'URL de base est correcte (Vercel)
- Vérifier les logs de l'API
- Tester avec un lien VidMoly simple

### Si la vidéo ne se lance pas :
- Vérifier les permissions iOS
- Vérifier que HLS.js n'interfère pas
- Tester avec un lien m3u8 direct

### Si l'interface ne s'adapte pas :
- Vérifier la configuration Capacitor
- Vérifier les styles CSS
- Tester sur différentes tailles d'écran
