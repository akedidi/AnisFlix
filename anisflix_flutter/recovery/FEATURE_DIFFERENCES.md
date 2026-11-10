# Comparaison fonctionnelle — actualisée le 9 novembre 2026

Références : code iOS `ios-natve/anisflix/anisflix`, APK mobile 1.0.3 build 9, APK TV 1.0.2 build 17 et reconstruction Flutter 0.5.1 build 9. Le build TV 50 reste une référence historique distincte. Un élément présent dans le code n'est pas une preuve de bon fonctionnement sur tous les appareils.

| Fonction | État Flutter / écart confirmé |
| --- | --- |
| Sources VF / VOSTFR / VO sur macOS | Moteur Swift iOS réutilisé ; règles d'ordre/libellés comparées à la sortie réelle des fonctions iOS. Voir IOS_NATIVE_PARITY.md. |
| Sources sur Android | Services Dart ; le moteur Swift concerne macOS. Parité exhaustive des résultats Android avec iOS non démontrée. |
| Fiches film/épisode | Panneau de sources à droite sur grand écran ; contrôles natifs ciblés, différences visuelles restantes dans design-qa.md. |
| Plateformes | 14 entrées de HomeView iOS avec logos carrés ; régions US pour Prime/Peacock, FR pour les autres. |
| Accueil / recherche / thèmes | Neuf catégories, autocomplétion avec rejet des réponses obsolètes, thèmes persistants testés. Fidélité visuelle complète de l'accueil encore non établie. |
| Reprise / favoris | Stockage local et reprise dans le lecteur implémentés. |
| Trakt | Authentification, rafraîchissement et scrobble implémentés ; synchronisation exhaustive de la bibliothèque iOS non démontrée. |
| Téléchargements | MP4/HLS/DASH et lecture hors ligne testés sur la reconstruction antérieure. Pas de certification pour tous les hébergeurs actuels. |
| PiP / mini-lecteur | Android mobile : mode système et mini-lecteur au-dessus du catalogue, avec navigation et réouverture sans recréer la vidéo, validés sur émulateur. macOS : fenêtre flottante redimensionnable, visible sur les espaces et au-dessus des autres applications ; pause/reprise et retour à la taille initiale sans recréer le lecteur. |
| Chromecast / AirPlay | Android mobile : boutons et menus distincts, découverte Chromecast par SDK Google et AirPlay par mDNS Android. Commandes HTTP AirPlay testées contre un récepteur local simulé ; refus de connexion conservant la lecture locale. Diffusion sur récepteurs physiques encore à valider ; AirPlay avec appairage non pris en charge. Intégrations macOS absentes. |
| Épisode suivant | Enchaînement et récupération du prochain épisode du lecteur iOS non implémentés dans le lecteur Flutter. |
| Sous-titres | Menu permanent : pistes de la vidéo, du fournisseur et liste OpenSubtitles via IMDb comme iOS natif, avec saison/épisode exacts. Recherche asynchrone, toutes les versions conservées, priorité français puis anglais, cache par épisode pour la lecture courante. Désactivation/automatique, décalage signé par pas de 0,1 seconde ou saisie manuelle, remise à zéro et taille du texte mémorisée. |
| Mise à jour de l'app | Absente en 0.4.0. Ajout en 0.5.0 : contrôle au démarrage et manuel, canal GitHub dédié, téléchargement vérifié, installateur Android / passage par Finder sur Mac. Publication du premier manifeste encore nécessaire. Voir APP_UPDATES.md. |

Les releases publiques examinées contiennent uniquement les anciens APK Android. Aucune release macOS ou manifeste de mise à jour de la reconstruction n'y figure au moment de cette vérification. Le blocage d'authentification GitHub empêche actuellement le push et la publication depuis cette session.
