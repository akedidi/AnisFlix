# Configuration Mobile Natif (iOS/Android)

## ✅ Modifications effectuées

### 1. **Header sous l'encoche (Safe Area)**

#### `client/src/components/CommonLayout.tsx`
- Le header a maintenant la classe `native-mobile` sur mobile natif
- Cette classe applique automatiquement `padding-top: env(safe-area-inset-top)`

#### `client/src/index.css`
```css
/* Safe Area pour iOS natif - Header sous l'encoche */
.native-mobile {
  padding-top: env(safe-area-inset-top);
}

/* Contenu principal avec safe area */
.native-only {
  padding-top: calc(53px + env(safe-area-inset-top));
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
}

/* TabBar native avec safe area */
ion-tab-bar {
  padding-bottom: env(safe-area-inset-bottom) !important;
  height: calc(70px + env(safe-area-inset-bottom)) !important;
}
```

### 2. **Navigation avec IonRouterOutlet (Push/Pop)**

#### Structure actuelle dans `AppNative.tsx`
```tsx
<IonApp>
  <IonReactRouter>
    <IonTabs>
      <IonRouterOutlet>
        {/* Toutes les routes */}
      </IonRouterOutlet>
      <IonTabBar slot="bottom">
        {/* Tabs */}
      </IonTabBar>
    </IonTabs>
  </IonReactRouter>
</IonApp>
```

#### `PageWrapper.tsx`
- Enveloppe automatiquement chaque page dans `<IonPage>` sur natif
- Permet les animations natives (push, pop, swipe back)
- Ne fait rien sur web (retourne le contenu tel quel)

```tsx
export default function PageWrapper({ children }: PageWrapperProps) {
  if (!isNativeApp()) {
    return <>{children}</>;
  }
  return <IonPage>{children}</IonPage>;
}
```

## 📱 Fonctionnalités natives

### ✅ Header
- **Position** : Fixed en haut
- **Safe Area** : Commence sous l'encoche iOS
- **Padding Top** : `env(safe-area-inset-top)` automatique

### ✅ TabBar
- **Position** : Fixed en bas
- **Safe Area** : Padding bottom pour l'encoche iPhone
- **Hauteur** : `70px + env(safe-area-inset-bottom)`

### ✅ Navigation
- **Type** : IonRouterOutlet (animations natives)
- **Push** : Animation de droite à gauche lors de la navigation vers une page
- **Pop** : Animation de gauche à droite lors du retour
- **Swipe Back** : Glissement depuis le bord gauche pour revenir
- **History** : Gestion automatique de l'historique par Ionic

### ✅ Pull to Refresh
- **Composant** : `IonicPullToRefresh`
- **Activé** : Uniquement sur natif (désactivé sur web)
- **Callback** : `onRefresh` dans `CommonLayout`

## 🔧 Configuration Capacitor

### `capacitor.config.ts`
Assurez-vous que la configuration inclut :
```typescript
{
  plugins: {
    StatusBar: {
      style: Style.Dark,
      backgroundColor: '#000000'
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Dark
    }
  }
}
```

## 🧪 Tests

### Sur iOS Simulator/Device
1. **Header** : Vérifier qu'il commence sous l'encoche (notch)
2. **Navigation** : 
   - Cliquer sur un film → animation push
   - Retour arrière → animation pop
   - Swipe depuis le bord gauche → retour animé
3. **TabBar** : Vérifier qu'elle ne chevauche pas l'encoche du bas
4. **Pull to Refresh** : Tirer vers le bas sur une page → rafraîchissement

### Sur Android Device
1. **Navigation** : Vérifier les animations Material Design
2. **Retour système** : Bouton retour Android fonctionne
3. **TabBar** : Position correcte en bas

## 📝 Notes importantes

### Safe Area Insets
- `env(safe-area-inset-top)` : Espace au-dessus (encoche, caméra)
- `env(safe-area-inset-bottom)` : Espace en-dessous (barre d'accueil iPhone)
- `env(safe-area-inset-left)` : Espace à gauche (iPhone en paysage)
- `env(safe-area-inset-right)` : Espace à droite (iPhone en paysage)

### IonRouterOutlet vs React Router
- **Web** : Utilise `BrowserRouter` (navigation classique)
- **Natif** : Utilise `IonRouterOutlet` (animations natives)
- **Détection** : Automatique via `isNativeApp()`

### PageWrapper
- **Obligatoire** : Sur toutes les pages dans `AppNative.tsx`
- **Facultatif** : Sur web (AppWeb.tsx n'utilise pas PageWrapper)
- **Rôle** : Envelopper dans `IonPage` pour activer les animations

## 🐛 Dépannage

### Le header ne respecte pas l'encoche
- Vérifier que la classe `native-mobile` est appliquée
- Vérifier dans l'inspecteur que `padding-top: env(safe-area-inset-top)` est présent

### Les animations ne fonctionnent pas
- Vérifier que toutes les pages sont enveloppées dans `PageWrapper`
- Vérifier que la structure est : IonApp > IonReactRouter > IonTabs > IonRouterOutlet
- S'assurer que `render={(props) => <PageWrapper>...` est utilisé

### La tabbar chevauche le contenu du bas
- Vérifier que `.native-only` a `padding-bottom: calc(70px + env(safe-area-inset-bottom))`
- Vérifier que `ion-tab-bar` a la bonne hauteur

### Le swipe back ne fonctionne pas
- S'assurer que `IonPage` enveloppe bien le contenu (via PageWrapper)
- Vérifier dans Xcode que les gestes sont activés

## 📦 Pour synchroniser avec iOS/Android

```bash
# Après modifications
npx cap sync ios
npx cap sync android

# Ouvrir dans Xcode/Android Studio
npx cap open ios
npx cap open android
```

