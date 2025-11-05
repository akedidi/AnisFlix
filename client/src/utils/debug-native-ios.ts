// Script pour logger tous les éléments critiques sur iOS natif
// À exécuter dans la console Safari Web Inspector sur iOS

(function() {
  console.log('🔍 ===== DIAGNOSTIC COMPLET iOS NATIF =====');
  
  // 1. Vérifier Capacitor
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
  const platform = isCapacitor ? (window as any).Capacitor.getPlatform() : 'web';
  console.log('📱 Capacitor:', {
    isCapacitor,
    platform,
    isNative: isCapacitor && (platform === 'ios' || platform === 'android')
  });
  
  // 2. Vérifier data-platform
  const dataPlatform = document.documentElement.getAttribute('data-platform');
  console.log('📊 data-platform:', dataPlatform);
  
  // 3. Vérifier ion-page
  const ionPages = document.querySelectorAll('ion-page');
  console.log('📄 ion-page:', {
    count: ionPages.length,
    elements: Array.from(ionPages).map((el, i) => ({
      index: i,
      classes: el.className,
      styles: {
        position: window.getComputedStyle(el).position,
        overflow: window.getComputedStyle(el).overflow,
        transform: window.getComputedStyle(el).transform
      }
    }))
  });
  
  // 4. Vérifier ion-router-outlet
  const ionRouterOutlet = document.querySelector('ion-router-outlet');
  console.log('🔄 ion-router-outlet:', {
    exists: !!ionRouterOutlet,
    styles: ionRouterOutlet ? {
      overflow: window.getComputedStyle(ionRouterOutlet).overflow,
      position: window.getComputedStyle(ionRouterOutlet).position,
      transform: window.getComputedStyle(ionRouterOutlet).transform
    } : null
  });
  
  // 5. Vérifier ion-content
  const ionContents = document.querySelectorAll('ion-content');
  console.log('📜 ion-content:', {
    count: ionContents.length,
    elements: Array.from(ionContents).map((el, i) => ({
      index: i,
      hasScrollY: el.hasAttribute('scrollY'),
      styles: {
        overflowY: window.getComputedStyle(el).overflowY,
        height: window.getComputedStyle(el).height
      }
    }))
  });
  
  // 6. Vérifier ion-refresher
  const ionRefresher = document.querySelector('ion-refresher');
  console.log('🔄 ion-refresher:', {
    exists: !!ionRefresher,
    slot: ionRefresher?.getAttribute('slot'),
    disabled: ionRefresher?.hasAttribute('disabled')
  });
  
  // 7. Vérifier header
  const header = document.querySelector('header, [class*="header"]');
  console.log('📋 Header:', {
    exists: !!header,
    classes: header?.className,
    styles: header ? {
      position: window.getComputedStyle(header).position,
      paddingTop: window.getComputedStyle(header).paddingTop,
      top: window.getComputedStyle(header).top,
      hasNativeMobileClass: header.classList.contains('native-mobile')
    } : null,
    rect: header?.getBoundingClientRect()
  });
  
  // 8. Vérifier ion-tab-bar
  const ionTabBar = document.querySelector('ion-tab-bar');
  console.log('📊 ion-tab-bar:', {
    exists: !!ionTabBar,
    styles: ionTabBar ? {
      position: window.getComputedStyle(ionTabBar).position,
      bottom: window.getComputedStyle(ionTabBar).bottom,
      paddingBottom: window.getComputedStyle(ionTabBar).paddingBottom
    } : null,
    rect: ionTabBar?.getBoundingClientRect()
  });
  
  // 9. Vérifier safe-area-inset-top
  const testDiv = document.createElement('div');
  testDiv.style.paddingTop = 'env(safe-area-inset-top)';
  testDiv.style.position = 'absolute';
  testDiv.style.visibility = 'hidden';
  document.body.appendChild(testDiv);
  const safeAreaTop = window.getComputedStyle(testDiv).paddingTop;
  document.body.removeChild(testDiv);
  console.log('📏 Safe Area:', {
    supports: typeof CSS !== 'undefined' && CSS.supports && CSS.supports('padding-top', 'env(safe-area-inset-top)'),
    computed: safeAreaTop,
    parsed: parseInt(safeAreaTop) || 0
  });
  
  console.log('✅ ===== FIN DU DIAGNOSTIC =====');
})();



