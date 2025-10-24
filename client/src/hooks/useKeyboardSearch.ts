import { useEffect, useRef } from 'react';

// Fonction pour détecter si on est sur mobile natif (Capacitor)
const isCapacitor = () => {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
};

/**
 * Hook pour forcer le clavier de recherche sur les plateformes mobiles
 * Résout le problème du clavier qui affiche "Accéder" au lieu de "Rechercher"
 */
export function useKeyboardSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isCapacitor() || !inputRef.current) return;

    const input = inputRef.current;
    
    // Fonction pour forcer le clavier de recherche
    const forceSearchKeyboard = () => {
      // Méthode 1: Attributs HTML
      input.setAttribute('inputmode', 'search');
      input.setAttribute('enterkeyhint', 'search');
      input.setAttribute('data-inputmode', 'search');
      input.setAttribute('data-enterkeyhint', 'search');
      
      // Méthode 2: Propriétés JavaScript
      input.inputMode = 'search';
      input.enterKeyHint = 'search';
      
      // Méthode 3: Forcer le type
      input.setAttribute('type', 'search');
      
      // Méthode 4: Attributs WebKit pour iOS
      input.setAttribute('webkit-input-mode', 'search');
      input.setAttribute('webkit-enter-key-hint', 'search');
      
      // Méthode 5: Style CSS inline
      input.style.setProperty('inputmode', 'search');
      input.style.setProperty('enterkeyhint', 'search');
    };

    // Appliquer immédiatement
    forceSearchKeyboard();

    // Événements pour maintenir le clavier de recherche
    const handleFocus = () => {
      forceSearchKeyboard();
      // Délai pour s'assurer que les attributs sont appliqués
      setTimeout(forceSearchKeyboard, 10);
    };

    const handleInput = () => {
      forceSearchKeyboard();
    };

    const handleBlur = () => {
      // Maintenir les attributs même après blur
      setTimeout(forceSearchKeyboard, 10);
    };

    // Ajouter les écouteurs d'événements
    input.addEventListener('focus', handleFocus);
    input.addEventListener('input', handleInput);
    input.addEventListener('blur', handleBlur);

    // Observer les changements d'attributs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'inputmode' || 
             mutation.attributeName === 'enterkeyhint')) {
          forceSearchKeyboard();
        }
      });
    });

    observer.observe(input, { 
      attributes: true, 
      attributeFilter: ['inputmode', 'enterkeyhint', 'type'] 
    });

    // Nettoyage
    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('input', handleInput);
      input.removeEventListener('blur', handleBlur);
      observer.disconnect();
    };
  }, []);

  return inputRef;
}
