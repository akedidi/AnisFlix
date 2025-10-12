# AnisFlix - Application Cross-Platform

AnisFlix est maintenant une application cross-platform compatible avec :
- **Web** (React Native Web)
- **iOS** (React Native)
- **Android** (React Native)
- **Android TV** (React Native avec support télécommande)

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+
- Expo CLI
- EAS CLI (pour les builds)
- Android Studio (pour Android/Android TV)
- Xcode (pour iOS)

### Installation des dépendances
```bash
npm install
```

### Configuration Expo
```bash
npx expo install --fix
```

## 📱 Développement

### Démarrer le serveur de développement
```bash
# Web
npm run expo:web

# iOS
npm run expo:ios

# Android
npm run expo:android

# Toutes les plateformes
npm run expo:start
```

## 🏗️ Build et Déploiement

### Configuration EAS
```bash
npx eas login
npx eas build:configure
```

### Builds de production
```bash
# Android
npm run expo:build:android

# iOS
npm run expo:build:ios

# Web
npm run expo:build:web

# Android TV
npm run expo:build:android-tv
```

## 📺 Support Android TV

L'application inclut un support complet pour Android TV avec :

### Navigation par télécommande
- **Flèches directionnelles** : Navigation entre les éléments
- **Entrée/Espace** : Sélection d'un élément
- **Retour** : Retour en arrière
- **Home** : Retour à l'accueil
- **Menu** : Menu contextuel

### Fonctionnalités TV
- Interface adaptée aux écrans 4K
- Navigation optimisée pour la télécommande
- Lecteur vidéo avec contrôles TV
- Focus visible sur les éléments interactifs

### Configuration Android TV
```json
{
  "androidTV": {
    "package": "com.anisflix.app.tv",
    "leanback": true,
    "icon": "./assets/tv-icon.png"
  }
}
```

## 🎨 Design Responsive

L'application s'adapte automatiquement selon la plateforme :

### Mobile (< 768px)
- Navigation par onglets en bas
- Cartes de média empilées verticalement
- Interface tactile optimisée

### Tablet (768px - 1024px)
- Navigation par onglets en bas
- Grille de cartes plus large
- Interface hybride tactile/clavier

### Android TV
- Navigation par télécommande
- Grille de cartes optimisée TV
- Interface 10-foot UI

### Web Desktop (> 1024px)
- Navigation par sidebar
- Grille de cartes large
- Interface clavier/souris

## 🔧 Configuration des APIs

### TMDB API
Ajoutez votre clé API TMDB dans `app/hooks/useTMDB.ts` :
```typescript
const TMDB_API_KEY = 'your-tmdb-api-key';
```

### Streaming APIs
Configurez vos APIs de streaming dans les hooks correspondants :
- `useFStream.ts` - Pour FStream
- `useTopStream.ts` - Pour TopStream

## 📁 Structure du Projet

```
app/
├── (tabs)/           # Navigation par onglets
│   ├── index.tsx     # Page d'accueil
│   ├── movies.tsx    # Page films
│   ├── series.tsx    # Page séries
│   └── settings.tsx  # Page paramètres
├── components/       # Composants partagés
│   ├── AdaptiveView.tsx
│   ├── AdaptiveText.tsx
│   ├── MediaCard.tsx
│   ├── MediaCarousel.tsx
│   ├── VideoPlayer.tsx
│   ├── TVNavigation.tsx
│   └── Focusable.tsx
├── hooks/           # Hooks personnalisés
│   ├── useDeviceType.ts
│   ├── useTVRemote.ts
│   └── useTMDB.ts
├── movie/[id].tsx   # Détail film
└── series/[id].tsx  # Détail série
```

## 🎯 Fonctionnalités

### ✅ Implémentées
- [x] Architecture cross-platform
- [x] Navigation responsive
- [x] Support Android TV
- [x] Lecteur vidéo adaptatif
- [x] Interface responsive
- [x] Navigation par télécommande
- [x] Composants partagés

### 🚧 En cours
- [ ] Intégration APIs de streaming
- [ ] Système de recherche
- [ ] Gestion des favoris
- [ ] Profils utilisateur
- [ ] Synchronisation cross-device

## 🐛 Dépannage

### Problèmes courants

#### Android TV ne détecte pas la télécommande
Vérifiez que l'application a les bonnes permissions dans `app.json` :
```json
{
  "android": {
    "permissions": ["INTERNET", "ACCESS_NETWORK_STATE"]
  }
}
```

#### Build Android TV échoue
Assurez-vous d'utiliser le profil de build correct :
```bash
npx eas build --platform android --profile android-tv
```

#### Problèmes de performance sur mobile
Optimisez les images et utilisez la pagination pour les listes longues.

## 📞 Support

Pour toute question ou problème, consultez :
- [Documentation Expo](https://docs.expo.dev/)
- [React Native TV](https://github.com/react-native-tv/react-native-tv)
- [NativeWind](https://www.nativewind.dev/)

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.
