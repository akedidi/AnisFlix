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

## Sous-titres et PiP macOS

- 65 tests unitaires/widgets réussis. Le menu permanent couvre l'absence de pistes, les pistes vidéo et du fournisseur, les valeurs signées avec virgule décimale, les pas de 0,1 seconde, la remise à zéro, la taille et les échecs de réglage. Une saisie plus récente est conservée lorsqu'un réglage précédent est encore en cours.
- `integration_test/player_features_test.dart` réussit sur macOS : sélection d'une piste MKV embarquée et d'un SRT externe, lecture des valeurs réelles `sub-delay` du moteur et contrôle du texte aux positions attendues pour +1 et −1 seconde ; taille 48 appliquée et mémorisée. Seule la saisie clavier est simulée par Flutter dans ce test ; le moteur vidéo, les sous-titres et la fenêtre sont natifs.
- Le même test vérifie le niveau flottant réel de la fenêtre PiP, sa réduction à 400 × 225 pixels de contenu, pause/reprise, restauration de la taille initiale et sortie du PiP à la fermeture de l'écran lecteur. Le contrôleur vidéo reste identique pendant ces transitions. Le PiP macOS utilise la fenêtre de l'application au niveau flottant.
- Les captures Flutter du menu de sous-titres et de la vidéo sous-titrée en PiP ont été examinées. Les commandes de reproduction sont dans [macos/README.md](../macos/README.md).

### Lecteur : Échap et décalage des sous-titres (2026-11-03)

- Le décalage figure avant les pistes dans la fenêtre des sous-titres.
- Les contrôles de bureau partagent un état de visibilité pour le survol, le masquage automatique et Échap. Le premier appui masque les contrôles visibles, y compris le titre et Retour ; un nouvel appui quitte le plein écran, ou la vidéo si elle est déjà en fenêtre. Les répétitions d'une touche maintenue sont ignorées.
- `test/player_controls_test.dart` et `test/subtitle_settings_test.dart` : 14 tests réussis. L'analyse Flutter ne signale aucun problème.
- `integration_test/player_escape_test.dart` réussit sur macOS avec une vidéo locale : focus initial, deux appuis en plein écran, priorité de fermeture des sous-titres, accès immédiat au décalage et sortie après masquage automatique.
- Pour les tests natifs, placer les fixtures dans un sous-dossier temporaire de `~/Library/Containers/com.anisflix.reconstructed.anisflixFlutter/Data/tmp/` et passer ce chemin via `--dart-define=FIXTURE_DIR=...` ; le sandbox refuse l'accès direct à Documents.

### Paramètres alignés sur iOS-native (2026-11-03)

- Référence : `ios-natve/anisflix/anisflix/Views/SettingsView.swift` dans le dépôt d'origine. Sections Apparence (langue, mode sombre), Sous-titres, Trakt, Données et Version ; la section de mises à jour Flutter est conservée. Les champs de service/clé TMDB, le bouton Enregistrer, l'ouverture d'URL vidéo et les mentions de reconstruction ne figurent plus dans ces paramètres.
- Les sept langues iOS sont disponibles dans les deux sélecteurs de langue. Les libellés communs des quatre langues ajoutées proviennent des traductions iOS ; les libellés spécifiques aux paramètres ont également été traduits. Les autres messages Flutter sans traduction conservent leur texte français.
- Taille des sous-titres partagée entre paramètres et lecteur : 50–150 %, pas de 10 %, 100 % correspondant aux 32 pixels existants. Les anciennes tailles hors intervalle sont bornées lors de la lecture.
- Le cache d'images se vide en mémoire et sur disque. La suppression de progression efface l'historique local et avertit les écrans abonnés sans toucher aux favoris, téléchargements ou préférences. Ces deux actions demandent confirmation dans l'app.
- Trakt utilise une fenêtre de connexion avec suivi automatique de l'autorisation, fermeture à la connexion et annulation du code à la fermeture.
- 125 tests unitaires/widgets réussis, dont persistance immédiate, disposition étroite/large, confirmations, préservation des favoris, rechargement des images après purge et cycle de connexion Trakt. Analyse Flutter sans anomalie.
