// Test ultra-simple pour identifier la cause exacte
console.log('🔍 [SIMPLE TEST] Démarrage du test simple');

let lastHeight = window.innerHeight;
let changeCount = 0;

const simpleCheck = () => {
  const currentHeight = window.innerHeight;
  
  if (currentHeight !== lastHeight) {
    changeCount++;
    console.log(`🎯 [SIMPLE TEST] Changement #${changeCount}: ${lastHeight} → ${currentHeight}`);
    
    // Si c'est le changement 778→812
    if (lastHeight === 778 && currentHeight === 812) {
      console.log('🎯 [SIMPLE TEST] CHANGEMENT CIBLE DÉTECTÉ!');
      
      // Vérifier l'état du DOM
      console.log('📏 [SIMPLE TEST] État du DOM:');
      console.log('📏 [SIMPLE TEST] document.body.style:', document.body.style.cssText);
      console.log('📏 [SIMPLE TEST] document.documentElement.style:', document.documentElement.style.cssText);
      
      // Vérifier les éléments récemment ajoutés
      const allElements = document.querySelectorAll('*');
      console.log('📏 [SIMPLE TEST] Nombre total d\'éléments:', allElements.length);
      
      // Chercher les éléments avec des hauteurs importantes
      const largeElements = [];
      allElements.forEach((el, index) => {
        if (el instanceof HTMLElement) {
          const rect = el.getBoundingClientRect();
          if (rect.height > 100) {
            largeElements.push({
              index,
              tagName: el.tagName,
              className: el.className,
              height: rect.height,
              id: el.id
            });
          }
        }
      });
      
      console.log('📏 [SIMPLE TEST] Éléments avec hauteur > 100px:', largeElements.length);
      largeElements.forEach(el => {
        console.log('📏 [SIMPLE TEST]', el.tagName, el.className, 'height:', el.height);
      });
    }
    
    lastHeight = currentHeight;
  }
};

// Vérification simple toutes les 100ms
setInterval(simpleCheck, 100);

console.log('🔍 [SIMPLE TEST] Test simple actif - surveillez la console');
