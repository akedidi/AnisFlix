# Script de Diagnostic iOS - À exécuter dans Safari Web Inspector

## 1. Ouvrir Safari Web Inspector
1. Sur iPhone : Réglages > Safari > Avancé > Inspecteur Web (activé)
2. Sur Mac : Safari > Développement > [iPhone] > [AnisFlix]

## 2. Copier-coller ce script dans la console

```javascript
(function() {
  console.log('🔍 ===== DIAGNOSTIC COMPLET iOS =====');
  
  // 1. Platform Detection
  const isCapacitor = typeof window !== 'undefined' && window.Capacitor !== undefined;
  const platform = isCapacitor ? window.Capacitor.getPlatform() : 'web';
  const dataPlatform = document.documentElement.getAttribute('data-platform');
  
  console.log('📱 PLATFORM:', {
    isCapacitor,
    capacitorPlatform: platform,
    dataPlatformAttribute: dataPlatform,
    shouldBeNative: platform === 'ios' || platform === 'android'
  });
  
  // 2. Structure DOM
  const ionApp = document.querySelector('ion-app');
  const ionTabs = document.querySelector('ion-tabs');
  const ionRouterOutlet = document.querySelector('ion-router-outlet');
  const ionTabBar = document.querySelector('ion-tab-bar');
  const ionPages = document.querySelectorAll('ion-page');
  const ionContents = document.querySelectorAll('ion-content');
  const ionRefresher = document.querySelector('ion-refresher');
  
  console.log('📊 STRUCTURE DOM:', {
    hasIonApp: !!ionApp,
    hasIonTabs: !!ionTabs,
    hasIonRouterOutlet: !!ionRouterOutlet,
    hasIonTabBar: !!ionTabBar,
    ionPagesCount: ionPages.length,
    ionContentsCount: ionContents.length,
    hasIonRefresher: !!ionRefresher
  });
  
  // 3. Vérifier ion-tab-bar
  if (ionTabBar) {
    const tabbarRect = ionTabBar.getBoundingClientRect();
    const tabbarStyles = window.getComputedStyle(ionTabBar);
    const windowHeight = window.innerHeight;
    
    console.log('🔷 ION-TAB-BAR:', {
      exists: true,
      rect: {
        top: tabbarRect.top,
        bottom: tabbarRect.bottom,
        left: tabbarRect.left,
        right: tabbarRect.right,
        width: tabbarRect.width,
        height: tabbarRect.height
      },
      styles: {
        display: tabbarStyles.display,
        visibility: tabbarStyles.visibility,
        opacity: tabbarStyles.opacity,
        position: tabbarStyles.position,
        bottom: tabbarStyles.bottom,
        zIndex: tabbarStyles.zIndex,
        transform: tabbarStyles.transform,
        backgroundColor: tabbarStyles.backgroundColor
      },
      windowHeight,
      isAtBottom: Math.abs(tabbarRect.bottom - windowHeight) < 10,
      isVisible: tabbarStyles.display !== 'none' && tabbarStyles.visibility !== 'hidden' && parseFloat(tabbarStyles.opacity) > 0
    });
    
    // Prendre screenshot de la zone de la tabbar
    console.log('📸 Pour screenshot de la tabbar, cliquer sur l\'élément dans l\'inspecteur');
  } else {
    console.log('❌ ION-TAB-BAR: Pas trouvée dans le DOM !');
  }
  
  // 4. Vérifier ion-refresher
  if (ionRefresher) {
    const refresherStyles = window.getComputedStyle(ionRefresher);
    console.log('🔄 ION-REFRESHER:', {
      exists: true,
      slot: ionRefresher.getAttribute('slot'),
      disabled: ionRefresher.hasAttribute('disabled') || ionRefresher.getAttribute('disabled') === 'true',
      styles: {
        display: refresherStyles.display,
        visibility: refresherStyles.visibility,
        opacity: refresherStyles.opacity
      }
    });
  } else {
    console.log('❌ ION-REFRESHER: Pas trouvée dans le DOM !');
  }
  
  // 5. Vérifier ion-page
  if (ionPages.length > 0) {
    const firstPage = ionPages[0];
    const pageStyles = window.getComputedStyle(firstPage);
    const pageRect = firstPage.getBoundingClientRect();
    
    console.log('📄 ION-PAGE (première):', {
      count: ionPages.length,
      rect: {
        top: pageRect.top,
        bottom: pageRect.bottom,
        height: pageRect.height
      },
      styles: {
        display: pageStyles.display,
        visibility: pageStyles.visibility,
        opacity: pageStyles.opacity,
        position: pageStyles.position,
        overflow: pageStyles.overflow,
        transform: pageStyles.transform,
        backgroundColor: pageStyles.backgroundColor
      }
    });
  } else {
    console.log('❌ ION-PAGE: Aucune trouvée !');
  }
  
  // 6. Vérifier ion-content
  if (ionContents.length > 0) {
    const firstContent = ionContents[0];
    const contentStyles = window.getComputedStyle(firstContent);
    
    console.log('📜 ION-CONTENT (premier):', {
      count: ionContents.length,
      hasScrollY: firstContent.hasAttribute('scrollY') || firstContent.getAttribute('scroll-y') === 'true',
      styles: {
        display: contentStyles.display,
        overflowY: contentStyles.overflowY,
        height: contentStyles.height
      }
    });
  } else {
    console.log('⚠️ ION-CONTENT: Aucun trouvé !');
  }
  
  // 7. Vérifier le header
  const headers = document.querySelectorAll('header, [class*="header"]');
  if (headers.length > 0) {
    const firstHeader = headers[0];
    const headerStyles = window.getComputedStyle(firstHeader);
    const headerRect = firstHeader.getBoundingClientRect();
    
    console.log('📋 HEADER:', {
      count: headers.length,
      classes: firstHeader.className,
      hasNativeMobileClass: firstHeader.classList.contains('native-mobile'),
      rect: {
        top: headerRect.top,
        height: headerRect.height
      },
      styles: {
        position: headerStyles.position,
        paddingTop: headerStyles.paddingTop,
        top: headerStyles.top
      }
    });
  }
  
  // 8. Vérifier le main-content
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const contentStyles = window.getComputedStyle(mainContent);
    const contentRect = mainContent.getBoundingClientRect();
    
    console.log('📦 MAIN-CONTENT:', {
      exists: true,
      rect: {
        top: contentRect.top,
        bottom: contentRect.bottom,
        height: contentRect.height
      },
      styles: {
        paddingTop: contentStyles.paddingTop,
        paddingBottom: contentStyles.paddingBottom
      }
    });
  }
  
  // 9. Safe Area
  const testDiv = document.createElement('div');
  testDiv.style.paddingTop = 'env(safe-area-inset-top)';
  testDiv.style.paddingBottom = 'env(safe-area-inset-bottom)';
  testDiv.style.position = 'absolute';
  testDiv.style.visibility = 'hidden';
  document.body.appendChild(testDiv);
  const computedStyles = window.getComputedStyle(testDiv);
  const safeAreaTop = computedStyles.paddingTop;
  const safeAreaBottom = computedStyles.paddingBottom;
  document.body.removeChild(testDiv);
  
  console.log('📏 SAFE AREA:', {
    top: safeAreaTop,
    bottom: safeAreaBottom,
    topParsed: parseInt(safeAreaTop) || 0,
    bottomParsed: parseInt(safeAreaBottom) || 0
  });
  
  console.log('✅ ===== FIN DU DIAGNOSTIC =====');
  console.log('📸 PROCHAINES ÉTAPES:');
  console.log('1. Prendre un screenshot de la page complète');
  console.log('2. Inspecter ion-tab-bar dans l\'inspecteur et prendre un screenshot');
  console.log('3. Essayer de tirer vers le bas pour tester le pull-to-refresh');
  console.log('4. Naviguer vers une page et observer l\'animation');
})();
```

## 3. Prendre des screenshots

### Screenshot 1 : Vue complète
1. Dans Safari Web Inspector, onglet "Éléments"
2. Cliquer sur l'icône 📷 en haut à droite
3. Sauvegarder comme `ios-complete-view.png`

### Screenshot 2 : Zone de la TabBar
1. Dans l'inspecteur, chercher `<ion-tab-bar>`
2. Cliquer dessus pour le sélectionner
3. Cliquer sur l'icône 📷
4. Sauvegarder comme `ios-tabbar-zone.png`

### Screenshot 3 : Après scroll
1. Dans le simulateur, scroller vers le bas
2. Prendre un screenshot du simulateur (⌘+S dans le simulateur)
3. Sauvegarder comme `ios-after-scroll.png`

## 4. Analyser les résultats

Regarder dans la console pour :
- ❌ = Élément manquant
- ⚠️ = Avertissement
- ✅ = OK
- 📊 = Données de mesure

## 5. Envoyer les informations

Copier tout le contenu de la console et les screenshots.


