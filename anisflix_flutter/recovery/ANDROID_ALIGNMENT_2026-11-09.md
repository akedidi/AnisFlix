# Alignement Android mobile et Android TV — 9 novembre 2026

Les lecteurs des deux variantes ont été alignés en **0.5.1+9**, après les builds 7 et 8. La livraison suivante **0.5.1+10** conserve ces lecteurs et ajoute l’incrémentation automatique commune décrite dans [APP_UPDATES.md](APP_UPDATES.md). Chaque variante conserve sa propre référence : mobile **1.0.3 build 9**, asset du tag `android-v1.0.2-3`, et TV **1.0.2 build 17**, tag `android-v1.0.2-17`. Le contrôle de l’API GitHub du 9 novembre retrouve les mêmes 12 releases. Le build TV 50 proposé sur un tag plus ancien reste une référence historique distincte.

## Modifications

- Android TV : disposition de la release **build 17**, titre seul, fermeture circulaire en haut à gauche, commandes centrales −10 s / lecture-pause / +10 s, progression rouge, temps écoulé à gauche, sous-titres et format à droite avant la durée totale. Le build 17 n’affiche pas de curseur de volume ni de boutons PiP/plein écran : ces ajouts du build 8 ont été retirés de son interface.
- TV : navigation et activation par télécommande, focus circulaire rouge avec bord blanc, sauts de 10 secondes et masquage des commandes avant sortie. Les panneaux de réglages gardent leur propre focus ; le volume reste réglable par les touches de volume.
- Android mobile : disposition de la release **build 9**, titre avec chevron de réduction et AirPlay en haut, commandes centrales réparties sur la largeur, progression rouge, ligne inférieure temps écoulé / sous-titres / Chromecast / PiP / format / plein écran / durée totale. Les mêmes commandes sont conservées en plein écran.
- Mobile : le chevron ouvre un mini-lecteur au-dessus du catalogue. Navigation, pause/reprise, diffusion, réouverture et fermeture conservent la même session ; la fermeture sauvegarde la progression par épisode. Les entrées depuis les fiches, les téléchargements et l’URL directe passent par le même parcours.
- Sous-titres et format : panneaux en bas avec cartes et sélection rouge, décalage ±0,1 seconde, saisie précise conservée, taille mémorisée et pistes existantes conservées. Sans piste active, « Sous-titres désactivés » est marqué comme sélectionné. Le curseur de taille reprend la couleur rouge de la release.
- Mobile : boutons AirPlay et Chromecast séparés, découverte réseau réelle et commandes de lecture, pause, recherche et arrêt. Une connexion refusée conserve la lecture locale. AirPlay utilise le protocole HTTP vidéo ; les récepteurs nécessitant un appairage ne sont pas pris en charge.
- French Anime : le contrôle réel de « Devils’ Crest » S1E2 a reproduit une absence de sources alors que la fiche était passée de la première à la deuxième page de la catégorie. Le repli consulte désormais au maximum trois pages par catégorie après le sitemap, puis la recherche existante. Il s’arrête dès qu’un flux fonctionne et conserve le filtrage du titre, de la saison, de l’épisode et de la langue.

Les onglets mobile, grilles, filtres, recherche TV et fiches d’épisode du build 7 sont conservés. Les correctifs Anime-Sama, les règles de disponibilité des épisodes, la reprise au démarrage via `Media.start`, les réglages des sous-titres et la suppression de la fausse fenêtre d’erreur macOS restent présents dans les sources communes.

## Contrôles

- **167 tests unitaires et de widgets réussis**, analyse Flutter sans anomalie.
- **Deux tests natifs réussis**, sur émulateurs Android TV et Android mobile API 34.
- Les deux APK Release **0.5.1 build 9** sont compilés pour ARM64 et ARMv7. Identifiants de paquet, version, lanceur Leanback TV et signatures vérifiés avec `aapt` et `apksigner`. Les certificats sont identiques à ceux du build 8 (et du build 7), ce qui conserve la compatibilité de remplacement des applications reconstruites.

Le test `integration_test/android_player_controls_test.dart` utilise une vidéo locale sur Android API 34, dans les variantes TV et mobile. Il contrôle les sauts, les panneaux de sous-titres et de format, la conservation du lecteur et la sauvegarde de la position par épisode. Sur TV, il vérifie le focus à la télécommande. Sur mobile, il vérifie réduction, interaction avec le catalogue, réouverture, menus AirPlay/Chromecast et plein écran. Les captures Flutter des commandes et des panneaux ont été comparées aux captures des APK de référence ; elles ne prouvent pas le rendu des images vidéo.

Les tests de widgets couvrent les touches lorsque les commandes sont masquées, la navigation entre boutons, les répétitions de OK, le premier Retour système, l’ordre des actions mobile et le choix du format. Le protocole AirPlay est testé contre un serveur local, y compris le refus de connexion. Les tests French Anime couvrent les deux premières pages et la limite de trois pages lorsque le titre est absent.

Le contrôle réseau réel du résolveur Dart a obtenu des données vidéo HTTP 206 pour Anime-Sama (« Liar Game » S1E1 et S1E26) et French Anime (« Devils’ Crest » S1E2 et « L’Attaque des Titans » S3E1, avec son titre original dans les métadonnées). Les réponses sont datées et peuvent évoluer. Les rapports locaux ne conservent ni URL de lecture signée ni en-tête sensible.

Les journaux et captures du build 9, les vérifications des APK et le rapport de synchronisation sont conservés dans `work/android-player-parity-build9/`. Les preuves du build 8 et des sources réseau restent dans `work/android-alignment-2026-11-09/`. Les APK précédents y sont sauvegardés avant remplacement. Les APK sont livrés localement ; aucune nouvelle release GitHub n’est publiée par cette opération.

## Écarts restants

Le défaut OpenGL de Media Kit déjà isolé sur ces émulateurs peut laisser la vidéo noire malgré un état de lecture valide. Les tests de commandes et les réponses vidéo HTTP ne certifient pas l’affichage du flux ; il reste à le valider sur téléphone et TV physiques. La diffusion vers des récepteurs Chromecast et AirPlay physiques reste à valider. L’enchaînement automatique vers l’épisode suivant n’est pas implémenté. La parité visuelle et fonctionnelle exhaustive avec les APK officiels n’est pas déclarée.

## Reproduction

```sh
. ./.toolchain.env
"$FLUTTER_BIN" analyze --no-pub
"$FLUTTER_BIN" test --no-pub
"$FLUTTER_BIN" test --no-pub integration_test/android_player_controls_test.dart \
  -d <emulateur-tv> --flavor tv --dart-define=TV_MODE=true
"$FLUTTER_BIN" test --no-pub integration_test/android_player_controls_test.dart \
  -d <emulateur-mobile> --flavor mobile
tool/build.sh android
```

Préparer `/data/local/tmp/anisflix-media/test.mp4` avec la fixture locale de `tool/prepare_media_fixture.py`. Le paramètre optionnel `CAPTURE_URL` du test transmet uniquement ses captures PNG à un collecteur de test local, relié par `adb reverse` ; il n’est pas utilisé par l’application de production.
