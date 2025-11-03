# Guide des Plateformes - AnisFlix

Ce document décrit les différentes expériences UI selon la plateforme.

## 🎯 Détection des Plateformes

L'application distingue 3 plateformes :

### 1. **Web Desktop** (`web-desktop`)
- **Détection** : Navigateur web avec largeur >= 768px
- **Caractéristiques** :
  - Sidebar fixe à gauche (256px)
  - Header fixe en haut (décalé de 256px pour la sidebar)
  - Navigation classique (React Router)
  - Pas de tabbar
  - Scroll sur `body`

### 2. **Web Mobile** (`web-mobile`)
- **Détection** : Navigateur web avec largeur < 768px
- **Caractéristiques** :
  - Header fixe en haut (pleine largeur)
  - Tabbar fixe en bas (`IonTabBar`)
  - Navigation classique (React Router via `IonTabs`)
  - Pas de sidebar
  - Pas de pull-to-refresh
  - Scroll sur `ion-router-outlet`

### 3. **Native Mobile** (`native-mobile`)
- **Détection** : Capacitor iOS/Android (avec plugins)
- **Caractéristiques** :
  - Header relatif (géré par Ionic)
  - Tabbar fixe en bas (`IonTabBar`)
  - Navigation Ionic (`IonRouterOutlet` avec push/swipe back)
  - Pull-to-refresh (`IonRefresher`)
  - Pages wrappées dans `IonPage` pour animations
  - Scroll sur `IonContent`

## 🔧 Utilisation dans le Code

### Hook React

```typescript
import { usePlatformDetection } from '@/hooks/usePlatformDetection';

function MyComponent() {
  const platform = usePlatformDetection();
  
  // Accès aux propriétés
  if (platform.isWebDesktop) {
    // Code spécifique desktop
  }
  
  if (platform.isWebMobile) {
    // Code spécifique web mobile
  }
  
  if (platform.isNativeMobile) {
    // Code spécifique natif
  }
}
```

### Classes CSS avec attributs data

Le composant `PlatformWrapper` ajoute automatiquement :
- `data-platform="web-desktop"` ou `"web-mobile"` ou `"native-mobile"`
- Classes CSS : `platform-web-desktop`, `platform-web-mobile`, `platform-native-mobile`

**Utilisation CSS :**
```css
/* CSS spécifique desktop */
[data-platform="web-desktop"] .my-element {
  margin-left: 256px;
}

/* CSS spécifique web mobile */
[data-platform="web-mobile"] .my-element {
  padding-bottom: 70px;
}

/* CSS spécifique natif */
[data-platform="native-mobile"] .my-element {
  padding: 0;
}
```

### Classes utilitaires

```tsx
// Cacher sur desktop
<div className="mobile-only">...</div>

// Cacher sur mobile
<div className="desktop-only">...</div>

// Cacher sur web (afficher uniquement natif)
<div className="native-only">...</div>
```

## 📁 Structure des Fichiers

```
client/src/
├── hooks/
│   └── usePlatformDetection.ts    # Hook principal de détection
├── lib/
│   └── platform-detection.ts      # Utilitaires sans hooks
├── styles/
│   └── platform-specific.css       # CSS par plateforme
└── components/
    └── PlatformWrapper.tsx         # Wrapper qui ajoute data-platform
```

## 🎨 Règles par Plateforme

### Web Desktop
- ✅ Sidebar visible
- ✅ Header fixe avec `md:left-64`
- ✅ Navigation React Router classique
- ❌ Pas de tabbar
- ❌ Pas de pull-to-refresh

### Web Mobile
- ❌ Pas de sidebar
- ✅ Header fixe pleine largeur
- ✅ Tabbar fixe en bas
- ✅ Navigation React Router dans `IonTabs`
- ❌ Pas de pull-to-refresh

### Native Mobile
- ❌ Pas de sidebar
- ✅ Header relatif (Ionic)
- ✅ Tabbar fixe en bas
- ✅ Navigation Ionic avec animations
- ✅ Pull-to-refresh actif
- ✅ Pages wrappées dans `IonPage`

## 📝 Notes Importantes

1. **CSS spécifique** : Utilisez `[data-platform="..."]` dans `platform-specific.css`
2. **Classes conditionnelles** : Utilisez `platform.isWebDesktop`, etc. pour le rendu conditionnel
3. **Responsive** : La détection desktop/mobile se base sur `window.innerWidth >= 768px`
4. **Native** : La détection native utilise `isNativeApp()` qui vérifie Capacitor + plugins


