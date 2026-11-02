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

Livrables finaux 0.4.0+4 : compilation macOS universelle (arm64/x86_64), APK mobile et TV réussies. Versions des deux APK confirmées par aapt et signatures vérifiées par apksigner. Application macOS signée localement, vérifiée par codesign --deep --strict, installée dans `~/Applications/AnisFlix.app` et démarrée. La signature du framework App a été renouvelée après compilation, puis celle du bundle avec les droits réseau et sandbox de production.

## Mise à jour 0.5.0 — mécanisme de mise à jour de l'app

- Analyse Flutter sans anomalie et 61 tests unitaires/widgets réussis. Nouvelles vérifications : versions/builds, pagination GitHub, identifiants/canal compatibles, erreurs réseau, URLs et métadonnées, contrôle SHA-256, fichier tronqué/corrompu/modifié, préférence de contrôle automatique.
- Deux tests natifs macOS réussis : requête des releases GitHub réelles (aucune mise à jour compatible publiée), téléchargement d'une archive contrôlée, passage au Finder accepté et refus d'un chemin hors cache. Le premier essai a révélé un désaccord de dossier entre path_provider et le canal Swift ; corrigé en utilisant le cache macOS avec le suffixe d'identifiant de bundle.
- Un test natif Android TV/API 34 réussi : refus de chemins hors cache, faux APK, autre application, signature différente et même build ; passage par les réglages d'autorisation puis l'installateur pour un APK de test compatible 0.5.1+6 signé avec la même clé de développement. Les APK de test restent dans work/ et ne sont pas diffusés.
- Le mécanisme de publication de production et les écarts restants sont documentés dans APP_UPDATES.md et FEATURE_DIFFERENCES.md. Aucun succès de distribution GitHub n'est affirmé : le premier manifeste compatible reste à publier.

Les certificats de signature des APK de production mobile et TV sont identiques à ceux des APK 0.4.0, ce qui permet leur remplacement par la même application. Le contrôle du canal s'appuie sur le paquet installé et non le type d'appareil : une édition mobile utilisée sur une TV reste sur le canal mobile.

Les trois builds de production finaux 0.5.0+5 ont réussi. macOS universel a été signé localement, contrôlé avec codesign --deep --strict, installé et lancé. Les deux APK ont passé aapt/apksigner, et leurs certificats correspondent à ceux de 0.4.0. Le générateur a produit anisflix-update.json à partir des trois livrables en vérifiant identifiants, versions et tailles ; la publication demeure bloquée par l'authentification GitHub.

## Correction de la hauteur du lecteur macOS

- Le nouveau test `integration_test/player_layout_test.dart` reproduit le défaut avant correction : une vidéo de 960 × 64 pixels dans un écran de 960 × 540. Le `Stack` se dimensionnait sur la barre de titre.
- Le lecteur occupe désormais toute la surface disponible ; la barre de titre reste positionnée en haut. Le test natif passe à l'ouverture, pendant la lecture d'un MP4 de démonstration décodé en 1280 × 720, puis après redimensionnement à 640 × 360 et 480 × 600, sans recréer le lecteur. La capture Flutter du lecteur à 960 × 540 a été examinée.
- Les 61 tests unitaires/widgets passent et l'analyse Flutter du dépôt principal ne signale aucune anomalie. La fixture macOS doit se trouver dans le conteneur de l'application pour respecter sa sandbox ; les commandes sont dans [macos/README.md](../macos/README.md).
- La cible macOS, son projet Xcode et ses services Swift sont déjà suivis dans `anisflix_flutter/macos/` du dépôt principal. Le correctif, le test et les instructions sont synchronisés dans ce même projet.
