import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';

// Fonction pour détecter si on est sur mobile natif (Capacitor)
const isCapacitor = () => {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
};

/**
 * Hook pour configurer le clavier de recherche sur les plateformes mobiles
 * Utilise le plugin @capacitor/keyboard pour masquer la barre "Done"
 * Force les attributs HTML natifs pour le clavier de recherche
 */
export function useKeyboardSearch() {
  useEffect(() => {
    if (!isCapacitor()) return;

    // Masquer la barre "Done" (accessory bar) sur iOS
    const hideAccessoryBar = async () => {
      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        console.log('🔍 [KEYBOARD] Barre "Done" masquée');
      } catch (error) {
        console.warn('🔍 [KEYBOARD] Erreur lors du masquage de la barre:', error);
      }
    };

    // Forcer les attributs de clavier de recherche sur tous les inputs
    const forceSearchKeyboard = () => {
      const searchInputs = document.querySelectorAll('input[type="search"]');
      searchInputs.forEach((input: any) => {
        // Vérifier si les attributs sont déjà corrects pour éviter la boucle
        const currentInputmode = input.getAttribute('inputmode');
        const currentEnterkeyhint = input.getAttribute('enterkeyhint');
        
        if (currentInputmode !== 'search' || currentEnterkeyhint !== 'search') {
          // Attributs HTML natifs (minuscules)
          input.setAttribute('inputmode', 'search');
          input.setAttribute('enterkeyhint', 'search');
          input.setAttribute('type', 'search');
          
          // Propriétés JavaScript
          input.inputMode = 'search';
          input.enterKeyHint = 'search';
          
          console.log('🔍 [KEYBOARD] Attributs de recherche appliqués:', {
            inputmode: input.getAttribute('inputmode'),
            enterkeyhint: input.getAttribute('enterkeyhint'),
            type: input.type
          });
        }
      });
    };

    // Configurer le clavier au démarrage
    hideAccessoryBar();
    forceSearchKeyboard();

    // Réappliquer la configuration si nécessaire
    const handleKeyboardShow = async () => {
      await hideAccessoryBar();
      forceSearchKeyboard();
    };

    // Observer les nouveaux inputs de recherche (avec debounce)
    let timeoutId: NodeJS.Timeout;
    const debouncedForceSearch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(forceSearchKeyboard, 100);
    };

    const observer = new MutationObserver((mutations) => {
      // Ne traiter que les mutations qui ajoutent de nouveaux éléments
      const hasNewElements = mutations.some(mutation => 
        mutation.type === 'childList' && mutation.addedNodes.length > 0
      );
      
      if (hasNewElements) {
        debouncedForceSearch();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Écouter les événements du clavier
    Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
    Keyboard.addListener('keyboardDidShow', handleKeyboardShow);

    // Nettoyage
    return () => {
      Keyboard.removeAllListeners();
      observer.disconnect();
    };
  }, []);
}