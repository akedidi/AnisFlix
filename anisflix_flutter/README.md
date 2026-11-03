# AnisFlix Flutter — reconstruction

Interface Flutter reconstruite à partir des APK officiels et du dépôt d’origine. Il ne s’agit pas des fichiers Dart originaux décompilés. Depuis 0.4.0, macOS réutilise le moteur de sources Swift du projet iOS natif fourni dans ce dépôt.

## Références examinées

- Mobile : release `android-v1.0.2-3`, APK portant réellement la version **1.0.3, build 9**.
- TV : release `android-v1.0.1-2`, asset principal portant réellement la version **1.0.9, build 50**. Cette ancienne étiquette contient le build TV le plus récent identifié ; `releases/latest` pointe vers un build TV plus ancien.
- Les deux APK embarquent `libflutter.so`, `libapp.so` compilé en AOT et `flutter_assets`.
- Les noms de fichiers Dart observables et les dépendances observables sont conservés dans `recovery/`. Ce sont des indices d’architecture, pas des sources récupérées.
- Images, icônes Android et bannière TV extraites de l’APK TV. Les icônes macOS sont dérivées de l’icône Android récupérée, avec une résolution source limitée à 192 pixels.

## Fonctions réécrites

- Accueil avec les neuf rangées observées dans l’APK TV : derniers films, derniers épisodes, dernières séries, films/séries populaires et quatre catégories d’animés.
- Menus Films et Séries en huit rangées : nouveautés, action (action et aventure pour les séries), drame, policier, mystère, documentaire, science-fiction et animation. Depuis l’accueil et ces menus, « Voir tout » ouvre directement la grille de la catégorie avec pagination, sans titre générique supplémentaire ni filtres. Le nom de la catégorie reste dans la barre du haut. Les catégories reprennent les libellés identifiés dans l’APK TV et l’ordre du catalogue Web d’origine.
- Catalogues par plateforme alignés sur `ProviderMediaListView` iOS : Films, Séries, films d’Action/Drame/Comédie, puis séries d’Action/Drame/Comédie. Dix titres par rangée, catégories vides masquées et « Voir tout » paginé avec la même plateforme, le même genre et les mêmes paramètres TMDB que les services natifs.
- Section Animés : films et séries classés par date de sortie décroissante, avec les titres déjà sortis les plus récents en premier, y compris après pagination, sans sélecteur de plateforme.
- Recherche multi-type et exclusion des résultats de personnes. Les grilles chargent automatiquement la page suivante à l’approche du bas, avec un indicateur de chargement et un bouton de nouvelle tentative en cas d’erreur ; le genre et la plateforme restent appliqués.
- Fiches, saisons et épisodes utilisant le proxy existant, notamment pour ses saisons virtuelles.
- Favoris locaux, historique et reprise distincts par épisode.
- Fiches de film et d’épisode à deux colonnes sur TV/macOS : informations à gauche, sources à droite, filtres VF/VOSTFR/VO. macOS utilise la collecte native iOS ; les chemins Android affichent les résultats progressivement. Sur mobile, les sources restent dans la même fiche sous les informations.
- Fournisseurs MovieBox, VaPlayer, VixSrc, YFlix, FStream et fournisseurs français/anime via les services existants ; conservation des liens embed et extraction à la sélection pour les hébergeurs pris en charge.
- Thèmes clair, sombre et système, avec choix mémorisé et sélecteur accessible uniquement depuis l’accueil et les paramètres.
- Lecteur `media_kit`, commandes vidéo intégrées, raccourcis clavier et reprise de lecture.
- Commandes PiP, sous-titres et format d’image en bas à droite, également en plein écran. Formats Original, 16:9, 4:3 et Étiré, avec choix mémorisé.
- Menu de sous-titres : pistes de la vidéo, du fournisseur et recherche OpenSubtitles identique à iOS natif (IMDb, saison et épisode sélectionnés). Toutes les versions sont conservées, français puis anglais en tête ; chargement indépendant de la vidéo. Décalage par pas de 0,1 seconde ou saisie signée, remise à zéro et taille du texte mémorisée.
- PiP macOS sous forme de fenêtre flottante redimensionnable au-dessus des autres applications, avec commandes −10 s / lecture-pause / +10 s centrées et retour à la fenêtre normale sans recréer le lecteur.
- Téléchargements MP4, HLS VOD (y compris AES-128 standard) et DASH statique non protégé, publication atomique, annulation et lecture hors ligne.
- Service Android de téléchargement avec notification et maintien en activité, PiP sur les appareils compatibles.
- Connexion Trakt par code, stockage sécurisé, renouvellement de session et scrobbling.
- Interface mobile, barre latérale pour ordinateur/TV, focus visible, clavier TV à l’écran et variante Android avec lanceur Leanback.
- Interface et catalogue en français, anglais et espagnol : navigation, réglages, dialogues, lecteur, erreurs, composants système Flutter et notifications Android. Choix mémorisé depuis l’en-tête ou les paramètres ; textes centralisés dans `lib/l10n/`.
- Paramètres d’adresse du service et lecture d’une URL vidéo directe.

## Limites explicites

Cette reconstruction ne restitue pas les fichiers Dart originaux et n’établit pas une parité complète avec les APK.

- Les 12 releases GitHub accessibles vérifiées le 2 novembre 2026 ne contiennent aucun paquet macOS. La version Mac est compilée depuis cette reconstruction.
- L’accueil et la fiche de film ont été comparés avec l’APK TV original exécuté en émulateur. Le contrôle macOS utilise des captures du rendu Flutter pendant un test natif. Les extracteurs natifs, certains écrans et certains parcours restent différents.
- Extraction locale VixSrc, Vidzy et Vidmoly ajoutée. Les extracteurs locaux AnimePahe/HiAnime sont repris du moteur Swift sur macOS ; Android utilise encore leurs services serveur. Chromecast/AirPlay et actualisation automatique restent à reconstruire. La liste OpenSubtitles dépend de la disponibilité du service et du contenu ; les pistes du fournisseur et les pistes embarquées restent accessibles pendant la recherche.
- Les téléchargements acceptent les fichiers MP4, HLS à la demande et une partie des manifestes DASH statiques (SegmentTemplate/SegmentList). Les flux en direct, DRM et formes de segmentation non prises en charge échouent explicitement.
- Sur Android, le service de téléchargement reste soumis aux limites du système, aux autorisations et aux arrêts forcés. Les fichiers interrompus sont nettoyés au prochain lancement ; la reprise réseau après arrêt n’est pas implémentée. Sur Mac, garder l’application ouverte pendant le téléchargement.
- Les intégrations de sources dépendent des services externes existants. Les fournisseurs peuvent être indisponibles ou ne pas proposer un titre. Les anciens endpoints Cinepro/Vidlink renvoient actuellement HTTP 410 et ne sont plus interrogés. Les liens embed non pris en charge peuvent être listés, mais leur extraction échoue explicitement. Une liste de liens chargée ne valide pas la lecture de chaque hébergeur.
- Trakt est testé avec des réponses simulées ; aucune connexion à un compte réel n’a été effectuée.
- Le code de signature d’origine n’est pas récupérable depuis les APK. Les applications reconstruites ont de nouveaux identifiants et une nouvelle clé locale ; elles s’installent séparément des applications d’origine.

## Vérifications

0.4.0 : référence Swift exécutée pour tester les catégories, le classement et les libellés de liens ; grille de 14 logos et navigation Films/Séries testées. Trois tests natifs macOS contrôlent la grille, la fiche et ses thèmes, ainsi que des liens réels de film, épisode et animé.

- Analyse Flutter sans anomalie et 83 tests unitaires/de widgets, dont le chargement automatique des pages (requête unique, dernière page, listes courtes et erreurs), les catégories Films/Séries, leurs filtres par genre et plateforme, le stockage, la navigation, les titres longs sur petits écrans et les traductions français/anglais/espagnol.
- Trois tests d’intégration sur émulateur Android TV ARM64, également réussis sur macOS : téléchargement de MP4/HLS/DASH, fermeture du serveur source, lecture locale avec rendu vidéo et piste audio, recherche dans la vidéo et persistance de la position.
- Les tests utilisent un extrait de démonstration Flutter et un son synthétique, indépendants des fournisseurs du catalogue. Préparer avec `tool/prepare_media_fixture.py`, transférer vers `/data/local/tmp/anisflix-media`, puis lancer `flutter test integration_test/playback_test.dart -d <device> --flavor tv --dart-define=TV_MODE=true`.
- Test macOS du démarrage réel de l’interface, du chargement du catalogue et d’une recherche TMDB.
- Test macOS de lecture/écriture/suppression d’un élément de test dans le Trousseau, sans connexion à un compte Trakt réel.
- La compilation Mac incluant les catégories Films/Séries et les dernières commandes du lecteur est installée dans `~/Applications/AnisFlix.app`. Après remplacement de l’ancienne compilation, l’accueil et les catégories Films/Séries ont été vérifiés directement dans l’application avec les données réelles du catalogue.
- Une validation sur émulateur ne remplace pas les essais sur les téléphones, téléviseurs et versions Android cibles.

## Développement et compilation

Dans le dépôt principal AnisFlix, ce projet est versionné dans `anisflix_flutter/`, avec sa [cible macOS](macos/README.md), son projet Xcode et ses services Swift. Les commandes ci-dessous se lancent depuis ce dossier.

Flutter utilisé : **3.47.9**, Dart **3.13.7**. Le fichier `pubspec.lock` fige les versions résolues.

1. Installer Flutter et les outils de la plateforme : Android SDK/JDK pour Android ; Xcode complet et les dépendances de plugins pour macOS.
2. `flutter pub get`
3. Copier `config.example.json` vers `config.local.json` et renseigner `TMDB_API_KEY`. Sur ce Mac, la configuration locale a été préparée avec la clé déjà utilisée dans le code Web du dépôt d’origine. Elle est exclue de l’archive publique et du suivi Git.
4. `tool/build.sh mobile`, `tool/build.sh tv` ou `tool/build.sh macos`.

Pour tester :

```sh
flutter analyze
flutter test
flutter test --dart-define=TV_MODE=true test/navigation_test.dart
```

Pour lancer depuis les sources :

```sh
flutter run --flavor mobile --dart-define-from-file=config.local.json
flutter run --flavor tv --dart-define=TV_MODE=true --dart-define-from-file=config.local.json
flutter run -d macos --dart-define-from-file=config.local.json
```

La clé renseignée dans l’interface n’est conservée qu’en mémoire pour la session. Les favoris, paramètres non sensibles et positions sont stockés localement.

## Signature

Une nouvelle clé privée est conservée dans `android/reconstruction.jks` avec sa configuration locale `android/key.properties`. Ces fichiers sont exclus de Git et des livrables de sources. Conserver une sauvegarde privée de ces deux fichiers pour pouvoir mettre à jour les APK reconstruits avec la même signature.

Sans configuration locale de signature, le modèle utilise la signature de développement. Une publication sur une boutique demande une configuration et une validation supplémentaires.

## Ressources et licences

Les ressources graphiques proviennent des APK fournis par le dépôt de l’utilisateur. `recovery/original-NOTICES.Z` conserve les notices incluses dans le build TV examiné. Les licences des dépendances de cette reconstruction sont accessibles avec le mécanisme de licences Flutter. Vérifier les droits sur les ressources et les contenus avant toute redistribution publique.

## Typographie

Roboto est embarquée pour conserver sur macOS la typographie de la version Android TV. Les fichiers proviennent du dépôt officiel googlefonts/roboto ; leur licence Apache 2.0 est incluse dans `assets/fonts/LICENSE.txt`.

Le détail des 14 familles de sources identifiées dans le build TV 50, de leurs adaptations macOS et de leurs limites est dans [SOURCE_PARITY.md](recovery/SOURCE_PARITY.md). Le contrôle réseau peut être relancé avec `python3 tool/audit_sources.py rapport.json`.

À partir de la version 0.4.0, macOS réutilise les services Swift du projet iOS pour ses liens. Les listes VF/VOSTFR/VO suivent leurs filtres et leur ordre ; voir [IOS_NATIVE_PARITY.md](recovery/IOS_NATIVE_PARITY.md). L’écran Plateformes affiche les 14 logos de la liste iOS sur deux lignes de sept, avec défilement horizontal dans les fenêtres étroites.

Les logos des 14 plateformes sont issus des chemins TMDB utilisés par le projet iOS et embarqués dans `assets/providers/`. Pour régénérer la référence de classement Swift sur macOS : `python3 tool/generate_ios_policy_reference.py /chemin/vers/ios-natve/anisflix/anisflix`.

## Mises à jour de l'application

Depuis 0.5.0, les paramètres proposent une vérification au démarrage ou manuelle, le téléchargement avec contrôle SHA-256 et le passage à l'installateur Android ou au Finder sur macOS. Un canal de release dédié évite de confondre les anciens APK officiels avec cette reconstruction. La première release compatible et son manifeste doivent encore être publiés ; la version 0.4.0 nécessite une première installation manuelle. Voir [recovery/APP_UPDATES.md](recovery/APP_UPDATES.md).

Les écarts fonctionnels encore confirmés avec iOS sont consignés dans [recovery/FEATURE_DIFFERENCES.md](recovery/FEATURE_DIFFERENCES.md), notamment Cast/AirPlay, le mini-lecteur dans les pages de navigation et l'épisode suivant.
