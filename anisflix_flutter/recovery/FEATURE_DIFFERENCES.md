# Comparaison fonctionnelle — 2 novembre 2026

Références : code iOS `ios-natve/anisflix/anisflix`, APK TV build 50, reconstruction Flutter. Un élément présent dans le code n'est pas une preuve de bon fonctionnement sur tous les appareils.

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
| PiP | Android mobile : mode système. macOS : fenêtre flottante redimensionnable, visible sur les espaces et au-dessus des autres applications ; pause/reprise et retour à la taille initiale sans recréer le lecteur. Le mini-lecteur dans les pages de navigation reste absent. |
| Chromecast / AirPlay | Intégrations natives iOS non reconstruites dans Flutter. |
| Épisode suivant | Enchaînement et récupération du prochain épisode du lecteur iOS non implémentés dans le lecteur Flutter. |
| Sous-titres | Menu permanent : pistes de la vidéo et du fournisseur, désactivation/automatique, décalage signé par pas de 0,1 seconde ou saisie manuelle, remise à zéro et taille du texte mémorisée. Le décalage s'applique à la lecture courante ; la recherche de sous-titres externes reste absente. |
| Mise à jour de l'app | Absente en 0.4.0. Ajout en 0.5.0 : contrôle au démarrage et manuel, canal GitHub dédié, téléchargement vérifié, installateur Android / passage par Finder sur Mac. Publication du premier manifeste encore nécessaire. Voir APP_UPDATES.md. |

Les releases publiques examinées contiennent uniquement les anciens APK Android. Aucune release macOS ou manifeste de mise à jour de la reconstruction n'y figure au moment de cette vérification. Le blocage d'authentification GitHub empêche actuellement le push et la publication depuis cette session.
