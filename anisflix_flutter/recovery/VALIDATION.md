# Validation du 2 novembre 2026 — reconstruction 0.2.0+2

Sources : `/Users/anis/Documents/ChatGPT/aniflix`.
Dépôt Web d’origine : `/Users/anis/Documents/perso/AnisFlix`.

- Vérification des 12 releases GitHub accessibles : aucun asset macOS.
- 24 tests unitaires/de widgets réussis ; analyse Flutter sans anomalie.
- Android TV ARM64/API 34 : 3 tests d’intégration de téléchargement et lecture MP4/HLS/DASH réussis, avec image 1280×720 et piste audio. Le serveur source est fermé avant lecture.
- macOS : les 3 mêmes tests réussissent, ainsi qu’un test du stockage sécurisé dans le Trousseau et un test du catalogue/recherche réels.
- APK TV final installé et démarré sur émulateur : flèche bas + validation ouvre Films ; six flèches bas supplémentaires + validation ouvre Paramètres.
- Application macOS de production compilée, signature locale vérifiée, installée et démarrée dans `~/Applications/AnisFlix.app`.
- L’autorisation de contrôle de l’écran n’est pas disponible pour vérifier visuellement l’interface macOS via Codex.
- Les services de lecture du catalogue, les intégrations natives manquantes et la parité visuelle complète ne sont pas certifiés par ces tests. Voir README.

Les journaux complets sont conservés localement dans `work/` et les journaux finaux accompagnent les livrables.

## Mise à jour 0.3.0 — sources et interface TV

La couverture des fournisseurs et les limites de lecture sont détaillées dans [SOURCE_PARITY.md](SOURCE_PARITY.md). Les tests natifs contrôlent les sources réelles pour un film, un épisode et un animé, le panneau à droite et les thèmes. Les comparaisons visuelles et leurs réserves sont dans [design-qa.md](design-qa.md). Les validations 0.2.0 ci-dessus concernent le build précédent et ne prouvent pas la lecture de toutes les sources ajoutées.

Validation 0.3.0 : analyseur sans problème, 42 tests unitaires/widgets réussis, 2 tests natifs macOS réussis. Collecte réelle : 33 liens film, 24 épisode, 15 animé. Ces comptes incluent des embeds et ne garantissent pas la lecture de chaque hébergeur.

## Mise à jour 0.4.0 — référence iOS

- Analyse Flutter sans anomalie et 47 tests unitaires/widgets réussis, dont une comparaison des catégories, du classement et des libellés avec les fonctions Swift iOS exécutées sur les mêmes fixtures.
- Trois tests natifs macOS réussis : grille de 14 logos, panneau de sources à droite dans les deux thèmes, collecte réelle via le moteur Swift iOS pour un film, un épisode et un animé.
- Collecte réelle : film 9 VF / 1 VOSTFR / 9 VO ; épisode 7 VF / 2 VOSTFR / 10 VO ; animé 2 VF / 0 VOSTFR / 3 VO. Rapport sans URL ni en-tête : `source-audit-ios-engine-0.4.0.json`.
- Ces comptes dépendent des services distants et ne prouvent pas la lecture de chaque lien. Les erreurs individuelles des fournisseurs sont traitées comme dans iOS et ne sont pas exposées dans ce rapport.
- Les régions des catalogues de plateformes correspondent à iOS : US pour Amazon Prime et Peacock, FR pour les autres.

Voir [IOS_NATIVE_PARITY.md](IOS_NATIVE_PARITY.md) et [ios-native-engine-provenance.json](ios-native-engine-provenance.json) pour les adaptations et limites.
