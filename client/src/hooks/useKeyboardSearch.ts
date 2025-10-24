import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';

// Fonction pour détecter si on est sur mobile natif (Capacitor)
const isCapacitor = () => {
  return typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
};

/**
 * Hook pour configurer le clavier de recherche sur les plateformes mobiles
 * Utilise le plugin @capacitor/keyboard pour masquer la barre "Done"
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

    // Configurer le clavier au démarrage
    hideAccessoryBar();

    // Réappliquer la configuration si nécessaire
    const handleKeyboardShow = async () => {
      await hideAccessoryBar();
    };

    // Écouter les événements du clavier
    Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
    Keyboard.addListener('keyboardDidShow', handleKeyboardShow);

    // Nettoyage
    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);
}