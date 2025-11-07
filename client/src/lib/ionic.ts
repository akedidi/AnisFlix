// Configuration Ionic pour l'app (chargement dynamique)
export async function setupIonic() {
  const { setupIonicReact } = await import('@ionic/react');
  
  setupIonicReact({
    mode: 'ios', // Utiliser le mode iOS par défaut
    rippleEffect: false, // Désactiver l'effet ripple sur Android
    hardwareBackButton: false, // Désactiver le bouton retour hardware
  });
  
  return setupIonicReact;
}

export default setupIonic;
