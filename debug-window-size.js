// Script de diagnostic pour identifier les changements de taille de fenêtre
console.log('🔍 [DIAGNOSTIC] Démarrage du diagnostic de taille de fenêtre');

let initialHeight = window.innerHeight;
let initialScrollHeight = document.documentElement.scrollHeight;
let initialClientHeight = document.documentElement.clientHeight;

console.log('📏 [DIAGNOSTIC] Valeurs initiales:');
console.log('📏 [DIAGNOSTIC] window.innerHeight:', initialHeight);
console.log('📏 [DIAGNOSTIC] document.documentElement.scrollHeight:', initialScrollHeight);
console.log('📏 [DIAGNOSTIC] document.documentElement.clientHeight:', initialClientHeight);

// Surveiller les changements
const checkChanges = () => {
  const currentHeight = window.innerHeight;
  const currentScrollHeight = document.documentElement.scrollHeight;
  const currentClientHeight = document.documentElement.clientHeight;
  
  if (currentHeight !== initialHeight) {
    console.log('⚠️ [DIAGNOSTIC] CHANGEMENT window.innerHeight:', initialHeight, '→', currentHeight);
    console.log('⚠️ [DIAGNOSTIC] Stack trace:', new Error().stack);
  }
  
  if (currentScrollHeight !== initialScrollHeight) {
    console.log('⚠️ [DIAGNOSTIC] CHANGEMENT scrollHeight:', initialScrollHeight, '→', currentScrollHeight);
  }
  
  if (currentClientHeight !== initialClientHeight) {
    console.log('⚠️ [DIAGNOSTIC] CHANGEMENT clientHeight:', initialClientHeight, '→', currentClientHeight);
  }
};

// Vérifier toutes les 500ms
setInterval(checkChanges, 500);

// Surveiller les événements qui peuvent causer des changements
['resize', 'scroll', 'orientationchange', 'load', 'DOMContentLoaded'].forEach(event => {
  window.addEventListener(event, () => {
    console.log('📡 [DIAGNOSTIC] Événement:', event);
    checkChanges();
  });
});

// Surveiller les modifications du DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && 
        (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
      console.log('🔧 [DIAGNOSTIC] Modification DOM:', mutation.target, mutation.attributeName);
      checkChanges();
    }
  });
});

observer.observe(document.body, { 
  attributes: true, 
  attributeFilter: ['style', 'class'] 
});

observer.observe(document.documentElement, { 
  attributes: true, 
  attributeFilter: ['style', 'class'] 
});

console.log('🔍 [DIAGNOSTIC] Diagnostic actif - surveillez la console pour les changements');
