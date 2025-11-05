// Script de diagnostic avancé pour identifier la cause du changement 778 → 812
console.log('🔍 [ADVANCED DIAGNOSTIC] Démarrage du diagnostic avancé');

let initialHeight = window.innerHeight;
let heightChanges = [];
let domModifications = [];

// Surveiller les changements de hauteur spécifiques
const checkHeightChange = () => {
  const currentHeight = window.innerHeight;
  
  if (currentHeight !== initialHeight) {
    const change = {
      timestamp: new Date().toLocaleTimeString(),
      from: initialHeight,
      to: currentHeight,
      difference: currentHeight - initialHeight,
      stack: new Error().stack
    };
    
    heightChanges.push(change);
    console.log('🚨 [ADVANCED DIAGNOSTIC] CHANGEMENT DÉTECTÉ:', change);
    
    // Si c'est exactement le changement 778 → 812
    if (initialHeight === 778 && currentHeight === 812) {
      console.log('🎯 [ADVANCED DIAGNOSTIC] CHANGEMENT CIBLE TROUVÉ: 778 → 812');
      console.log('🎯 [ADVANCED DIAGNOSTIC] Stack trace:', change.stack);
      
      // Analyser le DOM à ce moment précis
      analyzeDOMState();
    }
    
    initialHeight = currentHeight;
  }
};

// Analyser l'état du DOM au moment du changement
const analyzeDOMState = () => {
  console.log('🔬 [ADVANCED DIAGNOSTIC] Analyse de l\'état du DOM:');
  
  // Vérifier les paddings
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const computedStyle = getComputedStyle(mainContent);
    console.log('📏 [ADVANCED DIAGNOSTIC] .main-content padding-bottom:', computedStyle.paddingBottom);
  }
  
  // Vérifier le body
  const bodyStyle = getComputedStyle(document.body);
  console.log('📏 [ADVANCED DIAGNOSTIC] body padding-bottom:', bodyStyle.paddingBottom);
  
  // Vérifier les éléments avec des paddings spécifiques
  const elementsWithPadding = document.querySelectorAll('[style*="padding"], [class*="padding"]');
  console.log('📏 [ADVANCED DIAGNOSTIC] Éléments avec padding:', elementsWithPadding.length);
  
  // Vérifier les styles inline
  console.log('📏 [ADVANCED DIAGNOSTIC] body.style:', document.body.style.cssText);
  console.log('📏 [ADVANCED DIAGNOSTIC] documentElement.style:', document.documentElement.style.cssText);
};

// Surveiller les modifications du DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
      
      const modification = {
        timestamp: new Date().toLocaleTimeString(),
        target: mutation.target.tagName + (mutation.target.className ? '.' + mutation.target.className : ''),
        attribute: mutation.attributeName,
        oldValue: mutation.oldValue,
        newValue: mutation.target.getAttribute(mutation.attributeName)
      };
      
      domModifications.push(modification);
      console.log('🔧 [ADVANCED DIAGNOSTIC] Modification DOM:', modification);
      
      // Vérifier si cette modification cause un changement de hauteur
      setTimeout(checkHeightChange, 10);
    }
  });
});

// Surveiller les événements qui peuvent déclencher des changements
const eventsToWatch = ['resize', 'scroll', 'orientationchange', 'load', 'DOMContentLoaded', 'focus', 'blur'];
eventsToWatch.forEach(event => {
  window.addEventListener(event, () => {
    console.log('📡 [ADVANCED DIAGNOSTIC] Événement:', event);
    setTimeout(checkHeightChange, 10);
  });
});

// Surveiller les setTimeout/setInterval qui peuvent modifier le DOM
const originalSetTimeout = window.setTimeout;
const originalSetInterval = window.setInterval;

window.setTimeout = function(callback, delay, ...args) {
  console.log('⏰ [ADVANCED DIAGNOSTIC] setTimeout appelé avec délai:', delay);
  return originalSetTimeout.call(this, function() {
    const result = callback.apply(this, arguments);
    setTimeout(checkHeightChange, 10);
    return result;
  }, delay, ...args);
};

window.setInterval = function(callback, delay, ...args) {
  console.log('⏰ [ADVANCED DIAGNOSTIC] setInterval appelé avec délai:', delay);
  return originalSetInterval.call(this, function() {
    const result = callback.apply(this, arguments);
    setTimeout(checkHeightChange, 10);
    return result;
  }, delay, ...args);
};

// Démarrer l'observation
observer.observe(document.body, { 
  attributes: true, 
  attributeFilter: ['style', 'class'],
  attributeOldValue: true
});

observer.observe(document.documentElement, { 
  attributes: true, 
  attributeFilter: ['style', 'class'],
  attributeOldValue: true
});

// Vérification périodique
setInterval(checkHeightChange, 100);

console.log('🔍 [ADVANCED DIAGNOSTIC] Diagnostic avancé actif - surveillez la console');
console.log('🎯 [ADVANCED DIAGNOSTIC] Recherche spécifique du changement 778 → 812');
