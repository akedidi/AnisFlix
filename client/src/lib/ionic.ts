import { setupIonicReact } from '@ionic/react';

// Configuration Ionic pour l'app
setupIonicReact({
  mode: 'ios', // Utiliser le mode iOS par défaut
  rippleEffect: false, // Désactiver l'effet ripple sur Android
  hardwareBackButton: false, // Désactiver le bouton retour hardware
});

export default setupIonicReact;
