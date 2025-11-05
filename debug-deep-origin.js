// Diagnostic profond pour capturer la VRAIE origine du changement 778→812
console.log('🔍 [DEEP DIAGNOSTIC] Démarrage du diagnostic profond');

let initialInnerHeight = window.innerHeight;
let initialVisualViewportHeight = window.visualViewport?.height;
let heightChanges = [];
let domModifications = [];
let systemEvents = [];

console.log('📏 [DEEP DIAGNOSTIC] Valeurs initiales:');
console.log('📏 [DEEP DIAGNOSTIC] window.innerHeight:', initialInnerHeight);
console.log('📏 [DEEP DIAGNOSTIC] visualViewport.height:', initialVisualViewportHeight);

// Surveiller les changements de innerHeight avec capture de la vraie origine
const checkHeightChange = () => {
  const currentInnerHeight = window.innerHeight;
  const currentVisualViewportHeight = window.visualViewport?.height;
  
  if (currentInnerHeight !== initialInnerHeight) {
    const change = {
      timestamp: new Date().toLocaleTimeString(),
      from: initialInnerHeight,
      to: currentInnerHeight,
      difference: currentInnerHeight - initialInnerHeight,
      visualViewportFrom: initialVisualViewportHeight,
      visualViewportTo: currentVisualViewportHeight,
      stack: new Error().stack
    };
    
    heightChanges.push(change);
    console.log('🎯 [DEEP DIAGNOSTIC] CHANGEMENT DÉTECTÉ:', change);
    
    // Si c'est le changement spécifique 778 → 812
    if (initialInnerHeight === 778 && currentInnerHeight === 812) {
      console.log('🎯 [DEEP DIAGNOSTIC] CHANGEMENT CIBLE: 778 → 812');
      console.log('🎯 [DEEP DIAGNOSTIC] Stack trace:', change.stack);
      
      // Analyser l'état du DOM à ce moment précis
      console.log('📏 [DEEP DIAGNOSTIC] État du DOM au moment du changement:');
      
      // Vérifier les styles appliqués
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      console.log('📏 [DEEP DIAGNOSTIC] body.style:', document.body.style.cssText);
      console.log('📏 [DEEP DIAGNOSTIC] html.style:', document.documentElement.style.cssText);
      console.log('📏 [DEEP DIAGNOSTIC] body.height:', bodyStyle.height);
      console.log('📏 [DEEP DIAGNOSTIC] html.height:', htmlStyle.height);
      
      // Vérifier les éléments récemment modifiés
      console.log('📏 [DEEP DIAGNOSTIC] Dernières modifications DOM:', domModifications.slice(-5));
      console.log('📏 [DEEP DIAGNOSTIC] Derniers événements système:', systemEvents.slice(-5));
    }
    
    initialInnerHeight = currentInnerHeight;
    initialVisualViewportHeight = currentVisualViewportHeight;
  }
};

// Surveiller les événements système qui peuvent déclencher des changements
const systemEventsToWatch = [
  'resize', 'orientationchange', 'load', 'DOMContentLoaded', 
  'focus', 'blur', 'pageshow', 'pagehide', 'beforeunload'
];

systemEventsToWatch.forEach(event => {
  window.addEventListener(event, () => {
    const eventInfo = {
      timestamp: new Date().toLocaleTimeString(),
      event: event,
      innerHeight: window.innerHeight,
      visualViewportHeight: window.visualViewport?.height
    };
    systemEvents.push(eventInfo);
    console.log('📡 [DEEP DIAGNOSTIC] Événement système:', eventInfo);
    
    // Vérifier le changement après l'événement
    setTimeout(checkHeightChange, 10);
  });
});

// Surveiller les modifications du DOM en profondeur
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    const modification = {
      timestamp: new Date().toLocaleTimeString(),
      type: mutation.type,
      target: mutation.target.tagName + (mutation.target.className ? '.' + mutation.target.className : ''),
      attributeName: mutation.attributeName,
      oldValue: mutation.oldValue,
      newValue: mutation.target.getAttribute ? mutation.target.getAttribute(mutation.attributeName) : null
    };
    
    domModifications.push(modification);
    console.log('🔧 [DEEP DIAGNOSTIC] Modification DOM:', modification);
    
    // Vérifier si cette modification affecte la hauteur
    setTimeout(checkHeightChange, 10);
  });
});

// Démarrer l'observation
observer.observe(document.body, { 
  attributes: true, 
  childList: true,
  subtree: true,
  attributeFilter: ['style', 'class'],
  attributeOldValue: true
});

observer.observe(document.documentElement, { 
  attributes: true, 
  childList: true,
  subtree: true,
  attributeFilter: ['style', 'class'],
  attributeOldValue: true
});

// Vérification périodique
setInterval(checkHeightChange, 500);

console.log('🔍 [DEEP DIAGNOSTIC] Diagnostic profond actif');
console.log('🎯 [DEEP DIAGNOSTIC] Recherche de la VRAIE origine du changement 778 → 812');
