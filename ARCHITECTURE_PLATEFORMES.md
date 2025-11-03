# Architecture Multi-Plateformes AnisFlix

## 📋 Vue d'ensemble

AnisFlix utilise une architecture modulaire avec **3 modes distincts** :

```
App.tsx (Point d'entrée)
    ├── AppNative.tsx (iOS/Android natif)
    ├── AppWeb.tsx
    │   ├── Desktop (>= 768px)
    │   └── Mobile (< 768px)
```

## 🎯 Caractéristiques par Plateforme

### 1. **Web Desktop** (>= 768px)
- ✅ Router : `wouter` (classique)
- ✅ Navigation : Sidebar à gauche
- ❌ **Pas de tabbar en bas**
- ❌ Pas de pull-to-refresh
- ✅ Scroll classique

### 2. **Web Mobile** (< 768px)
- ✅ Router : `wouter` (classique, comme desktop)
- ✅ **IonTabBar fixe en bas** (composant visuel uniquement)
- ❌ **Pas de IonRouterOutlet** (web uniquement)
- ❌ **Pas de pull-to-refresh** (web uniquement)
- ❌ Pas d'animations natives
- ✅ Header fixe en haut

### 3. **Native Mobile** (iOS/Android)
- ✅ Router : `IonReactRouter` avec `IonRouterOutlet`
- ✅ **IonTabBar natif avec safe area**
- ✅ **Animations natives** (push, pop, swipe back)
- ✅ **Pull-to-refresh natif** (IonRefresher)
- ✅ Header dans IonContent (sticky)
- ✅ Safe area pour encoche iPhone

## 🗂️ Structure des Fichiers

```
client/src/
├── App.tsx                      # Point d'entrée, détection de plateforme
├── AppNative.tsx                # App pour iOS/Android natif
├── AppWeb.tsx                   # App pour web (desktop + mobile)
├── components/
│   ├── CommonLayout.tsx         # Layout partagé (détecte la plateforme)
│   └── BottomNav.tsx            # (Legacy, non utilisé maintenant)
└── styles/
    ├── tabbar.css               # Styles IonTabBar par plateforme
    └── native-keyboard.css      # Styles clavier natif
```

## 🔍 Détection de Plateforme

### Dans `App.tsx`
```typescript
const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const hasCapacitor = (window as any).Capacitor !== undefined;
  if (!hasCapacitor) return false;
  
  const platform = (window as any).Capacitor?.getPlatform?.();
  return platform === 'ios' || platform === 'android';
};
```

### Dans `AppWeb.tsx`
```typescript
function isMobileWeb(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 767;
}
```

## 📱 IonTabBar - Configuration

### Web Mobile
```tsx
// IonTabBar utilisé comme composant visuel, pas de routing Ionic
function MobileWebTabBar() {
  const [location] = useLocation(); // wouter hook
  
  return (
    <IonTabBar slot="bottom">
      <Link href="/">
        <IonTabButton tab="home" selected={location === '/'}>
          <IonIcon icon={home} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>
      </Link>
      {/* ... autres onglets avec Link wouter ... */}
    </IonTabBar>
  );
}
```

**CSS** :
```css
@media (max-width: 767px) {
  ion-tab-bar {
    position: fixed !important;
    bottom: 0 !important;
    height: 70px !important;
  }
}
```

### Native Mobile
```tsx
<IonTabBar slot="bottom">
  {/* Même structure */}
</IonTabBar>
```

**CSS avec Safe Area** :
```css
[data-platform="native-mobile"] ion-tab-bar {
  position: fixed !important;
  bottom: 0 !important;
  padding-bottom: env(safe-area-inset-bottom, 20px) !important;
  height: calc(70px + env(safe-area-inset-bottom, 20px)) !important;
}
```

## 🔄 Pull-to-Refresh (Natif uniquement)

Sur **Native**, chaque page utilise `CommonLayout` qui détecte automatiquement la plateforme et enveloppe le contenu dans `IonContent` avec `IonRefresher` :

```tsx
// Dans CommonLayout.tsx
{platform.isNativeMobile && (
  <IonContent>
    <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
      <IonRefresherContent />
    </IonRefresher>
    {children}
  </IonContent>
)}
```

## 🎨 Animations Natives

### Configuration
`IonRouterOutlet` gère automatiquement les animations :
- **Push** : Navigation vers une nouvelle page (slide de droite à gauche)
- **Pop** : Retour arrière (slide de gauche à droite)
- **Swipe back** : Glisser depuis le bord gauche pour revenir

### Activation
```tsx
<IonRouterOutlet>
  <Route exact path="/movies" component={Movies} />
  <Route exact path="/movie/:id" component={MovieDetail} />
</IonRouterOutlet>
```

## 🧪 Testing

### Web Desktop
```bash
npm run dev
# Ouvrir http://localhost:5173 dans un navigateur (largeur > 768px)
```

### Web Mobile
```bash
npm run dev
# Ouvrir http://localhost:5173 dans DevTools mode mobile (< 768px)
```

### Native iOS
```bash
npm run dev
npx cap sync ios
npx cap open ios
# Lancer dans Xcode
```

### Native Android
```bash
npm run dev
npx cap sync android
npx cap open android
# Lancer dans Android Studio
```

## ✅ Checklist de Fonctionnalités

| Fonctionnalité | Web Desktop | Web Mobile | Native |
|----------------|-------------|------------|--------|
| Router | wouter | wouter | IonReactRouter |
| IonRouterOutlet | ❌ | ❌ | ✅ |
| Sidebar gauche | ✅ | ❌ | ❌ |
| TabBar bas | ❌ | ✅ (visuel) | ✅ (natif) |
| Pull-to-refresh | ❌ | ❌ | ✅ |
| Animations push/pop | ❌ | ❌ | ✅ |
| Swipe back | ❌ | ❌ | ✅ |
| Safe area (encoche) | N/A | N/A | ✅ |
| Header fixe | ✅ | ✅ | Sticky |

## 🐛 Debugging

### Vérifier la plateforme détectée
```javascript
// Dans la console du navigateur ou Xcode
console.log('[App] Platform:', {
  hasCapacitor: !!window.Capacitor,
  platform: window.Capacitor?.getPlatform?.(),
  isNative: /* résultat de isNativeApp() */
});
```

### Vérifier le composant chargé
```javascript
// Rechercher dans les logs
// Web : 🚀 [AppWeb] Rendering Web App
// Native : 🚀 [AppNative] Rendering Native App
```

### Vérifier la tabbar
```javascript
// Dans Safari Web Inspector ou Chrome DevTools
const tabbar = document.querySelector('ion-tab-bar');
const styles = window.getComputedStyle(tabbar);
console.log({
  position: styles.position,
  bottom: styles.bottom,
  height: styles.height
});
```

## 📝 Notes Importantes

1. **CommonLayout** doit détecter automatiquement la plateforme et adapter son comportement
2. **IonRefresher** ne doit être utilisé que sur natif
3. **Safe area** est gérée automatiquement par Ionic sur iOS
4. **Animations** sont automatiques avec IonRouterOutlet sur natif
5. **Web desktop** ne doit jamais afficher la tabbar

## 🚀 Prochaines Étapes

- [ ] Tester sur iOS physique
- [ ] Tester sur Android physique
- [ ] Vérifier les performances des animations
- [ ] Optimiser le pull-to-refresh
- [ ] Ajouter des tests automatisés

