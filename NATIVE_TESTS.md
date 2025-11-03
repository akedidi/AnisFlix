# Tests Mobile Natif - iOS/Android

## ✅ Configuration finale

### 1. **Structure des pages natives**
```
IonApp
└── IonReactRouter
    └── IonTabs
        ├── IonRouterOutlet
        │   └── Route (avec PageWrapper)
        │       └── IonPage (ajouté par PageWrapper)
        │           └── IonContent (ajouté par IonicPullToRefresh)
        │               └── Contenu de la page
        └── IonTabBar
```

### 2. **Composants clés**

#### PageWrapper (`client/src/components/PageWrapper.tsx`)
- Enveloppe chaque page dans `<IonPage>` sur natif uniquement
- Active les animations de navigation (push, pop, swipe back)
- Ne fait rien sur web

#### IonicPullToRefresh (`client/src/components/IonicPullToRefresh.tsx`)
- Enveloppe le contenu dans `<IonContent>` avec `<IonRefresher>`
- Actif uniquement sur natif (iOS/Android)
- Ne crée PAS de `IonPage` (déjà fait par PageWrapper)

#### CommonLayout (`client/src/components/CommonLayout.tsx`)
- Header avec classe `.native-mobile` → padding-top avec safe-area-inset-top
- Contenu avec classe `.native-only` → padding pour header et tabbar + safe-area

### 3. **Safe Area (iOS)**

```css
/* Header sous l'encoche */
.native-mobile {
  padding-top: env(safe-area-inset-top);
}

/* Contenu avec espacement pour header et tabbar */
.native-only {
  padding-top: calc(53px + env(safe-area-inset-top));
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
}

/* TabBar au-dessus de la barre d'accueil */
ion-tab-bar {
  padding-bottom: env(safe-area-inset-bottom) !important;
  height: calc(70px + env(safe-area-inset-bottom)) !important;
}
```

## 🧪 Tests à effectuer

### Test 1: Header sous l'encoche iOS
**Appareils**: iPhone X, 11, 12, 13, 14, 15 (avec encoche/Dynamic Island)

1. Ouvrir l'app sur simulateur iOS avec encoche
2. **Vérifier** : Le header commence juste sous l'encoche
3. **Vérifier** : La barre de statut (heure, batterie) est visible au-dessus du header
4. **Vérifier** : Le header ne chevauche pas l'encoche

**Résultat attendu** :
```
┌─────────────────────┐
│ 🕐 📶 🔋 (Status Bar)│ <- Encoche/Dynamic Island
├─────────────────────┤
│ [Search] 🇫🇷 🌙     │ <- Header (commence ici)
├─────────────────────┤
│                     │
│   Contenu           │
│                     │
```

### Test 2: Navigation avec animations Push/Pop
**Appareils**: Tous les iOS/Android

1. Depuis la page d'accueil, cliquer sur un film
2. **Vérifier** : Animation de transition (page glisse de droite à gauche)
3. Cliquer sur le bouton retour en haut à gauche
4. **Vérifier** : Animation de retour (page glisse de gauche à droite)
5. Ouvrir à nouveau le détail du film
6. Swiper depuis le bord gauche de l'écran
7. **Vérifier** : Retour animé avec swipe back

**Résultat attendu** :
- ✅ Animation fluide lors de la navigation vers le détail
- ✅ Animation de retour fluide
- ✅ Swipe back fonctionne depuis le bord gauche
- ✅ Historique de navigation maintenu

### Test 3: Pull to Refresh
**Appareils**: Tous les iOS/Android

1. Sur la page d'accueil (ou n'importe quelle page)
2. Tirer vers le bas depuis le haut de la page
3. **Vérifier** : Indicateur de chargement apparaît
4. **Vérifier** : Le texte "Tirez pour rafraîchir" / "Chargement..." s'affiche
5. Relâcher
6. **Vérifier** : La page se rafraîchit
7. **Vérifier** : L'indicateur disparaît après le chargement

**Résultat attendu** :
- ✅ Pull to refresh fonctionne en tirant vers le bas
- ✅ Animation fluide du spinner
- ✅ Page se rafraîchit avec nouvelles données
- ✅ Désactivé sur web (aucun effet)

### Test 4: TabBar au-dessus de la barre d'accueil
**Appareils**: iPhone sans bouton Home (X et suivants)

1. Naviguer entre les différents onglets
2. **Vérifier** : La tabbar ne chevauche pas la barre d'accueil blanche
3. **Vérifier** : Les icônes de la tabbar sont entièrement visibles
4. **Vérifier** : Un espace (padding) est présent entre la tabbar et le bas de l'écran

**Résultat attendu** :
```
│                     │
│   Contenu           │
│                     │
├─────────────────────┤
│ 🏠  🎬  📺  📻  ❤️ │ <- TabBar
├─────────────────────┤
│                     │ <- Padding pour barre d'accueil
└─────────────────────┘
     Barre d'accueil
```

### Test 5: Scroll et Safe Area
**Appareils**: iPhone avec encoche

1. Faire défiler une page avec beaucoup de contenu
2. **Vérifier** : Le contenu défile normalement
3. **Vérifier** : Le header reste fixe en haut
4. **Vérifier** : La tabbar reste fixe en bas
5. Faire défiler jusqu'en haut
6. **Vérifier** : Le premier élément n'est pas caché sous le header
7. Faire défiler jusqu'en bas
8. **Vérifier** : Le dernier élément n'est pas caché sous la tabbar

**Résultat attendu** :
- ✅ Scroll fluide
- ✅ Header et tabbar fixes
- ✅ Tout le contenu est visible (pas de chevauchement)

## 🐛 Problèmes potentiels et solutions

### Problème 1: Les animations ne fonctionnent pas
**Symptômes**: Navigation instantanée sans animation

**Solutions**:
1. Vérifier que toutes les pages utilisent `PageWrapper`
2. Vérifier la structure : `IonRouterOutlet > Route > PageWrapper > IonPage`
3. Vérifier le CSS de `ion-page` avec `position: absolute`

### Problème 2: Double scroll ou scroll bloqué
**Symptômes**: Le contenu ne défile pas ou défile de manière étrange

**Solutions**:
1. Vérifier qu'il n'y a qu'un seul `IonContent` par page (dans IonicPullToRefresh)
2. Vérifier que `IonPage` a `overflow: hidden`
3. Vérifier que `IonContent` a `overflow-y: auto`

### Problème 3: Header chevauche l'encoche
**Symptômes**: Le header cache la barre de statut

**Solutions**:
1. Vérifier que la classe `.native-mobile` est appliquée au header
2. Vérifier que `padding-top: env(safe-area-inset-top)` est présent
3. Inspecter dans Safari Web Inspector sur iOS

### Problème 4: Pull to refresh ne fonctionne pas
**Symptômes**: Rien ne se passe en tirant vers le bas

**Solutions**:
1. Vérifier que `IonicPullToRefresh` détecte bien le natif
2. Console log `isNative` dans `IonicPullToRefresh`
3. Vérifier que `IonRefresher` est bien dans `IonContent`

### Problème 5: Tabbar cache le contenu du bas
**Symptômes**: Le dernier élément est partiellement caché

**Solutions**:
1. Vérifier que `.native-only` a `padding-bottom: calc(70px + env(safe-area-inset-bottom))`
2. Vérifier que le padding est appliqué au contenu principal
3. Augmenter le padding si nécessaire

## 🔄 Commandes pour tester

```bash
# Synchroniser les modifications
export LANG=en_US.UTF-8
npx cap sync ios

# Ouvrir dans Xcode
npx cap open ios

# Build et run sur simulateur
# Dans Xcode : Product > Run (⌘R)

# Pour Android
npx cap sync android
npx cap open android
```

## 📱 Simulateurs recommandés pour tests

### iOS
- **iPhone 15 Pro** (Dynamic Island)
- **iPhone 14** (Notch)
- **iPhone SE (3rd gen)** (Pas d'encoche, pour vérifier la compatibilité)

### Android
- **Pixel 7 Pro** (Android 13+)
- **Samsung Galaxy S23** (One UI)

## 📊 Checklist finale

Avant de considérer les tests réussis, vérifier que :

- [ ] Header commence sous l'encoche iOS
- [ ] Navigation avec animation push (→)
- [ ] Navigation retour avec animation pop (←)
- [ ] Swipe back depuis le bord gauche fonctionne
- [ ] Pull to refresh fonctionne et rafraîchit la page
- [ ] TabBar ne chevauche pas la barre d'accueil
- [ ] Tout le contenu est visible (pas caché sous header/tabbar)
- [ ] Scroll fluide avec header/tabbar fixes
- [ ] Pas de double scroll
- [ ] Aucun élément ne chevauche l'encoche ou la barre d'accueil

## 🎯 Résultat attendu final

Une application native iOS/Android avec :
- ✅ UI adaptée aux encoches et barres d'accueil
- ✅ Animations natives fluides (push/pop/swipe)
- ✅ Pull to refresh natif fonctionnel
- ✅ Navigation avec historique
- ✅ Scroll naturel et fluide
- ✅ Expérience utilisateur native optimale

