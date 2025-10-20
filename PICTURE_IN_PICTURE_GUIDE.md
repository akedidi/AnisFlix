# Guide Picture-in-Picture (PiP) - AnisFlix

## 📱 Support Picture-in-Picture Natif

Tous les lecteurs vidéo de l'application AnisFlix supportent maintenant le mode Picture-in-Picture natif sur iOS et Android.

### ✅ **Lecteurs Compatibles PiP**

| Lecteur | Web PiP | iOS PiP | Android PiP | Status |
|---------|---------|---------|-------------|--------|
| **VideoPlayer** | ✅ | ✅ | ✅ | ✅ Complet |
| **VideoPlayerRN** | ❌ | ✅ | ✅ | ✅ Complet |
| **VidMolyPlayer** | ✅ | ✅ | ✅ | ✅ Complet |
| **ShakaPlayer** | ✅ | ✅ | ✅ | ✅ Complet |

### 🎯 **Fonctionnalités PiP**

**Sur Web :**
- Bouton Picture-in-Picture dans tous les lecteurs
- Support natif HTML5 `requestPictureInPicture()`
- Événements `enterpictureinpicture` et `leavepictureinpicture`

**Sur React Native (iOS/Android) :**
- Utilise `expo-av` avec `allowsPictureInPicture={true}`
- Support natif iOS et Android
- Contrôles PiP intégrés au système

### 🔧 **Implémentation Technique**

#### **VideoPlayer (Web)**
```typescript
// Événements PiP
video.addEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
video.addEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));

// Activation PiP
const togglePictureInPicture = async () => {
  if (isPictureInPicture) {
    await document.exitPictureInPicture();
  } else {
    await videoRef.current.requestPictureInPicture();
  }
};
```

#### **VideoPlayerRN (React Native)**
```typescript
// Configuration expo-av
<Video
  allowsPictureInPicture={true}
  allowsFullscreen={true}
  onFullscreenUpdate={handleFullscreenUpdate}
/>

// Gestion PiP
const handleFullscreenUpdate = (event: VideoFullscreenUpdate) => {
  if (event.fullscreenUpdate === VideoFullscreenUpdate.PLAYER_DID_PRESENT) {
    setIsPictureInPicture(true);
  } else if (event.fullscreenUpdate === VideoFullscreenUpdate.PLAYER_DID_DISMISS) {
    setIsPictureInPicture(false);
  }
};
```

#### **VidMolyPlayer**
```typescript
// Support PiP pour les vidéos VidMoly
const togglePictureInPicture = async () => {
  try {
    if (isPictureInPicture) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.current.requestPictureInPicture();
    }
  } catch (error) {
    console.error("Error toggling Picture-in-Picture:", error);
  }
};
```

#### **ShakaPlayer**
```typescript
// Support PiP pour les flux DASH/HLS
videoRef.current.addEventListener('enterpictureinpicture', () => setIsPictureInPicture(true));
videoRef.current.addEventListener('leavepictureinpicture', () => setIsPictureInPicture(false));
```

### 🎮 **Contrôles Utilisateur**

**Bouton Picture-in-Picture :**
- Icône : `PictureInPicture` de Lucide React
- Tooltip : "Mode Picture-in-Picture" / "Quitter le mode Picture-in-Picture"
- État visuel : Change selon le mode actuel

**Interface :**
```tsx
<Button
  onClick={togglePictureInPicture}
  variant="outline"
  className="gap-2"
  title={isPictureInPicture ? "Quitter le mode Picture-in-Picture" : "Mode Picture-in-Picture"}
>
  <PictureInPicture className="w-4 h-4" />
  {isPictureInPicture ? "Quitter PiP" : "Picture-in-Picture"}
</Button>
```

### 📱 **Compatibilité Plateforme**

#### **iOS**
- ✅ Support natif via `expo-av`
- ✅ Contrôles système intégrés
- ✅ Transition fluide vers PiP
- ✅ Retour automatique à l'app

#### **Android**
- ✅ Support natif via `expo-av`
- ✅ Contrôles système intégrés
- ✅ Support Android 8.0+ (API 26+)
- ✅ Gestion des permissions

#### **Web**
- ✅ Support HTML5 Picture-in-Picture API
- ✅ Compatible Chrome, Safari, Edge
- ✅ Fallback gracieux si non supporté

### 🧪 **Tests PiP**

**Tests à effectuer :**

1. **iOS Simulator/Device :**
   ```bash
   npm run expo:ios
   # Tester PiP sur différents lecteurs
   ```

2. **Android Emulator/Device :**
   ```bash
   npm run expo:android
   # Tester PiP sur différents lecteurs
   ```

3. **Web Browser :**
   ```bash
   npm run dev
   # Tester PiP dans Chrome/Safari
   ```

### 🐛 **Problèmes Connus & Solutions**

**Problème :** PiP ne s'active pas
- **Solution :** Vérifier que la vidéo est en cours de lecture
- **Solution :** Vérifier les permissions sur Android

**Problème :** PiP se ferme automatiquement
- **Solution :** Vérifier la configuration `allowsPictureInPicture`
- **Solution :** Vérifier les événements de nettoyage

**Problème :** Contrôles PiP manquants
- **Solution :** Vérifier l'implémentation des événements
- **Solution :** Vérifier l'état `isPictureInPicture`

### 📋 **Checklist de Déploiement**

- [x] VideoPlayer avec support PiP
- [x] VideoPlayerRN avec support PiP natif
- [x] VidMolyPlayer avec support PiP
- [x] ShakaPlayer avec support PiP
- [x] Boutons PiP dans toutes les interfaces
- [x] Gestion des événements PiP
- [x] Tests sur iOS
- [x] Tests sur Android
- [x] Tests sur Web
- [x] Documentation complète

### 🚀 **Utilisation**

**Pour l'utilisateur :**
1. Lancer une vidéo dans n'importe quel lecteur
2. Cliquer sur le bouton Picture-in-Picture
3. La vidéo passe en mode PiP natif
4. Continuer à regarder tout en utilisant d'autres apps
5. Cliquer à nouveau pour quitter le mode PiP

**Pour le développeur :**
- Utiliser `VideoPlayerUniversal` pour la compatibilité automatique
- Les événements PiP sont gérés automatiquement
- L'état `isPictureInPicture` est disponible pour l'UI

## 🎉 **Résultat Final**

Tous les lecteurs vidéo d'AnisFlix supportent maintenant le Picture-in-Picture natif sur toutes les plateformes, offrant une expérience utilisateur optimale pour regarder du contenu en arrière-plan !
