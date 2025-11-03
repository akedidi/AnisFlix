# 🔍 Guide de Debug - Logs iOS Natif

## 📋 Logs ajoutés

Des logs de debug ont été ajoutés dans plusieurs composants pour vérifier que les changements sont appliqués :

### Composants avec logs :

1. **`PlatformWrapper`** - Détection de plateforme
2. **`PageWrapper`** - Enveloppement dans IonPage
3. **`IonicPullToRefresh`** - Activation du pull to refresh
4. **`CommonLayout`** - Header safe area et refresh handler

## 🔧 Comment voir les logs

### Option 1 : Safari Web Inspector (Recommandé)

1. **Activer le Web Inspector sur iOS** :
   - Sur votre iPhone/iPad : Réglages > Safari > Avancé > Inspecteur Web (activé)

2. **Connecter l'appareil** :
   - Connecter votre iPhone/iPad à votre Mac via USB
   - Ouvrir l'app dans Xcode et lancer sur l'appareil

3. **Ouvrir Safari Web Inspector** :
   - Sur Mac : Safari > Développement > [Nom de votre iPhone] > [Nom de l'app]
   - La console Safari s'ouvre

4. **Voir les logs** :
   - Les logs apparaissent dans la console avec des emojis :
     - 🔍 = Debug/Info
     - ✅ = Succès
     - ⚠️ = Avertissement
     - 🔄 = Refresh/Animation
     - 📊 = Données/Mesures

### Option 2 : Console Xcode

1. Ouvrir Xcode
2. Lancer l'app sur un simulateur ou appareil
3. Dans la console Xcode, filtrer par "🔍" ou "[CommonLayout]" ou "[PageWrapper]"

### Option 3 : Script de diagnostic manuel

Dans Safari Web Inspector, coller ce script dans la console :

```javascript
// Script de diagnostic complet
(function() {
  console.log('🔍 ===== DIAGNOSTIC COMPLET iOS NATIF =====');
  
  // 1. Capacitor
  const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
  const platform = isCapacitor ? window.Capacitor.getPlatform() : 'web';
  console.log('📱 Capacitor:', { isCapacitor, platform, isNative: isCapacitor && (platform === 'ios' || platform === 'android') });
  
  // 2. data-platform
  const dataPlatform = document.documentElement.getAttribute('data-platform');
  console.log('📊 data-platform:', dataPlatform);
  
  // 3. ion-page
  const ionPages = document.querySelectorAll('ion-page');
  console.log('📄 ion-page:', { count: ionPages.length, elements: Array.from(ionPages).map((el, i) => ({ index: i, classes: el.className, styles: { position: window.getComputedStyle(el).position, overflow: window.getComputedStyle(el).overflow } })) });
  
  // 4. ion-router-outlet
  const ionRouterOutlet = document.querySelector('ion-router-outlet');
  console.log('🔄 ion-router-outlet:', { exists: !!ionRouterOutlet, styles: ionRouterOutlet ? { overflow: window.getComputedStyle(ionRouterOutlet).overflow, position: window.getComputedStyle(ionRouterOutlet).position } : null });
  
  // 5. ion-content
  const ionContents = document.querySelectorAll('ion-content');
  console.log('📜 ion-content:', { count: ionContents.length, elements: Array.from(ionContents).map((el, i) => ({ index: i, hasScrollY: el.hasAttribute('scrollY'), styles: { overflowY: window.getComputedStyle(el).overflowY } })) });
  
  // 6. ion-refresher
  const ionRefresher = document.querySelector('ion-refresher');
  console.log('🔄 ion-refresher:', { exists: !!ionRefresher, slot: ionRefresher?.getAttribute('slot'), disabled: ionRefresher?.hasAttribute('disabled') });
  
  // 7. Header
  const header = document.querySelector('header, [class*="header"]');
  console.log('📋 Header:', { exists: !!header, classes: header?.className, styles: header ? { position: window.getComputedStyle(header).position, paddingTop: window.getComputedStyle(header).paddingTop, hasNativeMobileClass: header.classList.contains('native-mobile') } : null });
  
  // 8. ion-tab-bar
  const ionTabBar = document.querySelector('ion-tab-bar');
  console.log('📊 ion-tab-bar:', { exists: !!ionTabBar, styles: ionTabBar ? { position: window.getComputedStyle(ionTabBar).position, bottom: window.getComputedStyle(ionTabBar).bottom } : null });
  
  // 9. Safe Area
  const testDiv = document.createElement('div');
  testDiv.style.paddingTop = 'env(safe-area-inset-top)';
  testDiv.style.position = 'absolute';
  testDiv.style.visibility = 'hidden';
  document.body.appendChild(testDiv);
  const safeAreaTop = window.getComputedStyle(testDiv).paddingTop;
  document.body.removeChild(testDiv);
  console.log('📏 Safe Area:', { computed: safeAreaTop, parsed: parseInt(safeAreaTop) || 0 });
  
  console.log('✅ ===== FIN DU DIAGNOSTIC =====');
})();
```

## 📊 Ce qu'il faut vérifier dans les logs

### 1. PlatformWrapper
```
🔍 [PlatformWrapper] Platform Detection: { platform: 'native-mobile', ... }
📊 [PlatformWrapper] Attributs data-platform définis: { html: 'native-mobile', ... }
```
✅ **Attendu** : `platform: 'native-mobile'`, `data-platform: 'native-mobile'`

### 2. PageWrapper
```
🔍 [PageWrapper] Debug: { isNative: true, willWrapInIonPage: true }
✅ [PageWrapper] Wrapping dans IonPage pour animations natives
```
✅ **Attendu** : `isNative: true`, message de succès

### 3. IonicPullToRefresh
```
🔍 [IonicPullToRefresh] Debug: { isCapacitor: true, platform: 'ios', isNative: true, ... }
✅ [IonicPullToRefresh] Activation du pull to refresh natif
```
✅ **Attendu** : `isNative: true`, message d'activation

### 4. CommonLayout - Header Safe Area
```
🔍 [CommonLayout] Header Safe Area Debug: { isCapacitor: true, isIOS: true, ... }
✅ [CommonLayout] Safe area top détecté: 44
✅ [CommonLayout] Padding appliqué au header: 44px
📊 [CommonLayout] Header a la classe native-mobile: true
```
✅ **Attendu** : Safe area détecté et appliqué, classe `native-mobile` présente

### 5. Pull to Refresh
```
🔄 [IonicPullToRefresh] onIonRefresh déclenché!
🔄 [CommonLayout] handleIonicRefresh appelé!
```
✅ **Attendu** : Ces logs apparaissent quand vous tirez vers le bas

## 🐛 Problèmes courants

### Si `platform: 'web'` au lieu de `'native-mobile'` :
- Vérifier que Capacitor est bien initialisé
- Vérifier que `isNativeApp()` dans `lib/platform.ts` détecte correctement

### Si `ion-page` n'existe pas :
- Vérifier que `PageWrapper` est utilisé dans `AppNative.tsx`
- Vérifier que `isNativeApp()` retourne `true`

### Si `ion-refresher` n'existe pas :
- Vérifier que `disabled={!isNativeMobile}` n'est pas `true`
- Vérifier que `IonicPullToRefresh` est bien rendu

### Si le header n'a pas le padding-top :
- Vérifier que la classe `native-mobile` est présente
- Vérifier que `headerRef.current` existe
- Vérifier que `isCapacitor && isIOS` est `true`

## 🔄 Synchroniser et tester

```bash
# 1. Construire l'app
npm run build

# 2. Synchroniser avec iOS
export LANG=en_US.UTF-8
npx cap sync ios

# 3. Ouvrir dans Xcode
npx cap open ios

# 4. Dans Xcode : Product > Build (⌘B) puis Run (⌘R)

# 5. Ouvrir Safari Web Inspector pour voir les logs
```

## 📝 Notes

- Les logs sont seulement en développement
- Pour voir les logs en production, il faudrait utiliser un service de logging externe
- Les logs avec emojis facilitent la lecture dans la console


