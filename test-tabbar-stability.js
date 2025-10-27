// Test de stabilité de la tab bar
console.log('🧪 [TAB BAR TEST] Démarrage du test de stabilité');

let initialTabBarPosition = null;
let testResults = [];

const testTabBarStability = () => {
  const tabBar = document.querySelector('.mobile-bottom-nav');
  if (!tabBar) {
    console.log('🧪 [TAB BAR TEST] Tab bar non trouvée');
    return;
  }

  const rect = tabBar.getBoundingClientRect();
  const currentPosition = {
    bottom: rect.bottom,
    top: rect.top,
    height: rect.height,
    windowHeight: window.innerHeight,
    visualViewportHeight: window.visualViewport?.height || window.innerHeight
  };

  if (!initialTabBarPosition) {
    initialTabBarPosition = currentPosition;
    console.log('🧪 [TAB BAR TEST] Position initiale:', initialTabBarPosition);
  } else {
    const bottomDiff = Math.abs(currentPosition.bottom - initialTabBarPosition.bottom);
    const topDiff = Math.abs(currentPosition.top - initialTabBarPosition.top);
    
    if (bottomDiff > 5 || topDiff > 5) {
      const result = {
        timestamp: new Date().toLocaleTimeString(),
        initial: initialTabBarPosition,
        current: currentPosition,
        bottomDiff,
        topDiff,
        windowHeightChange: currentPosition.windowHeight - initialTabBarPosition.windowHeight
      };
      
      testResults.push(result);
      console.log('🚨 [TAB BAR TEST] MOUVEMENT DÉTECTÉ:', result);
    } else {
      console.log('✅ [TAB BAR TEST] Tab bar stable - bottom:', currentPosition.bottom, 'top:', currentPosition.top);
    }
  }
};

// Test initial
testTabBarStability();

// Test périodique
setInterval(testTabBarStability, 1000);

// Test lors des changements de window.innerHeight
let lastWindowHeight = window.innerHeight;
const checkWindowHeightChange = () => {
  const currentHeight = window.innerHeight;
  if (currentHeight !== lastWindowHeight) {
    console.log('📏 [TAB BAR TEST] window.innerHeight changé:', lastWindowHeight, '→', currentHeight);
    setTimeout(testTabBarStability, 100); // Tester après le changement
    lastWindowHeight = currentHeight;
  }
};

setInterval(checkWindowHeightChange, 500);

console.log('🧪 [TAB BAR TEST] Test actif - surveillez la console pour les résultats');
