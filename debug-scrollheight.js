// Diagnostic spécifique pour identifier l'élément qui cause le changement de scrollHeight
console.log('🔍 [SCROLLHEIGHT DIAGNOSTIC] Démarrage du diagnostic scrollHeight');

let initialScrollHeight = document.documentElement.scrollHeight;
let initialBodyHeight = document.body.scrollHeight;

console.log('📏 [SCROLLHEIGHT DIAGNOSTIC] Valeurs initiales:');
console.log('📏 [SCROLLHEIGHT DIAGNOSTIC] document.documentElement.scrollHeight:', initialScrollHeight);
console.log('📏 [SCROLLHEIGHT DIAGNOSTIC] document.body.scrollHeight:', initialBodyHeight);

const checkScrollHeightChange = () => {
  const currentScrollHeight = document.documentElement.scrollHeight;
  const currentBodyHeight = document.body.scrollHeight;
  
  if (currentScrollHeight !== initialScrollHeight) {
    console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] CHANGEMENT DÉTECTÉ:');
    console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] scrollHeight:', initialScrollHeight, '→', currentScrollHeight);
    console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] Différence:', currentScrollHeight - initialScrollHeight);
    
    // Analyser tous les éléments pour trouver celui qui a changé
    const allElements = document.querySelectorAll('*');
    console.log('🔍 [SCROLLHEIGHT DIAGNOSTIC] Nombre total d\'éléments:', allElements.length);
    
    // Chercher les éléments avec des hauteurs importantes
    const largeElements = [];
    allElements.forEach((el, index) => {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        const computedStyle = getComputedStyle(el);
        
        if (rect.height > 100 || computedStyle.height.includes('px') && parseInt(computedStyle.height) > 100) {
          largeElements.push({
            index,
            tagName: el.tagName,
            className: el.className,
            height: rect.height,
            computedHeight: computedStyle.height,
            scrollHeight: el.scrollHeight,
            element: el
          });
        }
      }
    });
    
    console.log('📏 [SCROLLHEIGHT DIAGNOSTIC] Éléments avec hauteur > 100px:', largeElements.length);
    largeElements.forEach(el => {
      console.log('📏 [SCROLLHEIGHT DIAGNOSTIC]', el.tagName, el.className, 'height:', el.height, 'scrollHeight:', el.scrollHeight);
    });
    
    // Chercher spécifiquement les éléments qui ont été ajoutés récemment
    const newElements = document.querySelectorAll('[data-new], .fade-in-up, .page-enter, .scale-in');
    console.log('🆕 [SCROLLHEIGHT DIAGNOSTIC] Nouveaux éléments détectés:', newElements.length);
    newElements.forEach((el, index) => {
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        console.log('🆕 [SCROLLHEIGHT DIAGNOSTIC] Nouvel élément', index, ':', el.tagName, el.className, 'height:', rect.height);
      }
    });
    
    initialScrollHeight = currentScrollHeight;
  }
  
  if (currentBodyHeight !== initialBodyHeight) {
    console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] CHANGEMENT BODY:');
    console.log('🚨 [SCROLLHEIGHT DIAGNOSTIC] body.scrollHeight:', initialBodyHeight, '→', currentBodyHeight);
    initialBodyHeight = currentBodyHeight;
  }
};

// Surveiller les modifications du DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      console.log('🔧 [SCROLLHEIGHT DIAGNOSTIC] Ajout/suppression d\'éléments:', mutation.addedNodes.length, 'ajoutés,', mutation.removedNodes.length, 'supprimés');
      
      mutation.addedNodes.forEach((node, index) => {
        if (node instanceof HTMLElement) {
          console.log('➕ [SCROLLHEIGHT DIAGNOSTIC] Élément ajouté', index, ':', node.tagName, node.className);
          const rect = node.getBoundingClientRect();
          console.log('➕ [SCROLLHEIGHT DIAGNOSTIC] Dimensions:', rect.width, 'x', rect.height);
        }
      });
      
      // Vérifier le changement de scrollHeight après les modifications
      setTimeout(checkScrollHeightChange, 10);
    }
  });
});

// Démarrer l'observation
observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// Vérification périodique
setInterval(checkScrollHeightChange, 500);

console.log('🔍 [SCROLLHEIGHT DIAGNOSTIC] Diagnostic actif - surveillez la console');
