// Diagnostic spécialisé pour innerHeight - identifier la cause du changement 778 → 812
console.log('🎯 [INNERHEIGHT DIAGNOSTIC] Démarrage du diagnostic innerHeight');

let initialInnerHeight = window.innerHeight;
let heightChanges = [];
let eventLog = [];

console.log('📏 [INNERHEIGHT DIAGNOSTIC] Valeur initiale innerHeight:', initialInnerHeight);

// Surveiller les changements de innerHeight
const checkInnerHeightChange = () => {
  const currentInnerHeight = window.innerHeight;
  
  if (currentInnerHeight !== initialInnerHeight) {
    const change = {
      timestamp: new Date().toLocaleTimeString(),
      from: initialInnerHeight,
      to: currentInnerHeight,
      difference: currentInnerHeight - initialInnerHeight,
      stack: new Error().stack
    };
    
    heightChanges.push(change);
    console.log('🎯 [INNERHEIGHT DIAGNOSTIC] CHANGEMENT DÉTECTÉ:', change);
    
    // Si c'est le changement spécifique 778 → 812
    if (initialInnerHeight === 778 && currentInnerHeight === 812) {
      console.log('🎯 [INNERHEIGHT DIAGNOSTIC] CHANGEMENT CIBLE TROUVÉ: 778 → 812');
      console.log('🎯 [INNERHEIGHT DIAGNOSTIC] Stack trace:', change.stack);
      
      // Analyser l'état du viewport à ce moment précis
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] État du viewport:');
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] visualViewport.height:', window.visualViewport?.height);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] screen.height:', window.screen.height);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] screen.availHeight:', window.screen.availHeight);
      
      // Vérifier les styles qui peuvent affecter la hauteur
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] body.height:', bodyStyle.height);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] html.height:', htmlStyle.height);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] body.style:', document.body.style.cssText);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] html.style:', document.documentElement.style.cssText);
      
      // Vérifier les paddings qui peuvent causer le problème
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] body.paddingBottom:', bodyStyle.paddingBottom);
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] html.paddingBottom:', htmlStyle.paddingBottom);
      
      // Vérifier les éléments avec des hauteurs fixes
      const elementsWithHeight = document.querySelectorAll('[style*="height"], [class*="h-"]');
      console.log('📏 [INNERHEIGHT DIAGNOSTIC] Éléments avec hauteur:', elementsWithHeight.length);
      elementsWithHeight.forEach((el, index) => {
        if (el instanceof HTMLElement) {
          const rect = el.getBoundingClientRect();
          const computedStyle = getComputedStyle(el);
          if (rect.height > 50) {
            console.log('📏 [INNERHEIGHT DIAGNOSTIC] Élément', index, ':', el.tagName, el.className, 'height:', rect.height, 'computed:', computedStyle.height);
          }
        }
      });
    }
    
    initialInnerHeight = currentInnerHeight;
  }
};

// Surveiller les événements qui peuvent déclencher des changements
const eventsToWatch = ['resize', 'orientationchange', 'load', 'DOMContentLoaded', 'focus', 'blur'];
eventsToWatch.forEach(event => {
  window.addEventListener(event, () => {
    const eventInfo = {
      timestamp: new Date().toLocaleTimeString(),
      event: event,
      innerHeight: window.innerHeight
    };
    eventLog.push(eventInfo);
    console.log('📡 [INNERHEIGHT DIAGNOSTIC] Événement:', eventInfo);
    
    // Vérifier le changement après l'événement
    setTimeout(checkInnerHeightChange, 10);
  });
});

// Surveiller les modifications du DOM qui peuvent affecter la hauteur
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
      
      console.log('🔧 [INNERHEIGHT DIAGNOSTIC] Modification DOM:', {
        target: mutation.target.tagName,
        attribute: mutation.attributeName,
        oldValue: mutation.oldValue,
        newValue: mutation.target.getAttribute(mutation.attributeName)
      });
      
      // Vérifier si cette modification affecte la hauteur
      setTimeout(checkInnerHeightChange, 10);
    }
  });
});

// Surveiller les setTimeout/setInterval qui peuvent modifier le DOM
const originalSetTimeout = window.setTimeout;
const originalSetInterval = window.setInterval;

window.setTimeout = function(callback, delay, ...args) {
  console.log('⏰ [INNERHEIGHT DIAGNOSTIC] setTimeout appelé avec délai:', delay);
  return originalSetTimeout.call(this, function() {
    const result = callback.apply(this, arguments);
    setTimeout(checkInnerHeightChange, 10);
    return result;
  }, delay, ...args);
};

window.setInterval = function(callback, delay, ...args) {
  console.log('⏰ [INNERHEIGHT DIAGNOSTIC] setInterval appelé avec délai:', delay);
  return originalSetInterval.call(this, function() {
    const result = callback.apply(this, arguments);
    setTimeout(checkInnerHeightChange, 10);
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
setInterval(checkInnerHeightChange, 500);

console.log('🎯 [INNERHEIGHT DIAGNOSTIC] Diagnostic actif - surveillez la console');
console.log('🎯 [INNERHEIGHT DIAGNOSTIC] Recherche spécifique du changement 778 → 812');
