export const errorMessages = {
  // Messages d'erreur génériques
  generic: {
    title: "Erreur",
    retry: "Réessayer",
    ok: "OK",
    close: "Fermer"
  },
  
  // Messages spécifiques aux lecteurs
  players: {
    vidmoly: {
      title: "Erreur VidMoly",
      message: "Impossible d'extraire le lien de streaming VidMoly. Veuillez essayer un autre lien.",
      hlsNotSupported: "Votre navigateur ne supporte pas HLS"
    },
    
    vidzy: {
      title: "Erreur Vidzy",
      message: "Impossible d'extraire le lien de streaming Vidzy. Veuillez essayer un autre lien.",
      hlsNotSupported: "Votre navigateur ne supporte pas HLS"
    },
    
    darkibox: {
      title: "Erreur Darkibox",
      message: "Impossible de charger la source Darkibox. Veuillez essayer un autre lien.",
      hlsNotSupported: "Votre navigateur ne supporte pas HLS"
    },
    
    generic: {
      title: "Erreur de lecture",
      message: "Impossible de charger la source de streaming. Veuillez essayer un autre lien.",
      hlsNotSupported: "Votre navigateur ne supporte pas HLS"
    }
  },
  
  // Messages d'erreur réseau
  network: {
    title: "Erreur de connexion",
    message: "Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.",
    timeout: "La connexion a expiré. Veuillez réessayer."
  },
  
  // Messages d'erreur de format
  format: {
    title: "Format non supporté",
    message: "Ce format de vidéo n'est pas supporté par votre navigateur.",
    codecNotSupported: "Le codec vidéo n'est pas supporté."
  }
};

export type ErrorMessageKey = keyof typeof errorMessages;
export type PlayerErrorKey = keyof typeof errorMessages.players;
