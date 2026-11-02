# AnisFlix Flutter — reconstruction

Projet indépendant, réécrit à partir des APK officiels et du code Web public. Il ne s’agit pas des fichiers Dart originaux décompilés. Le projet d’origine `akedidi/AnisFlix` est conservé à côté, sans modification.

## Références examinées

- Mobile : release `android-v1.0.2-3`, APK portant réellement la version **1.0.3, build 9**.
- TV : release `android-v1.0.1-2`, asset principal portant réellement la version **1.0.9, build 50**. Cette ancienne étiquette contient le build TV le plus récent identifié ; `releases/latest` pointe vers un build TV plus ancien.
- Les deux APK embarquent `libflutter.so`, `libapp.so` compilé en AOT et `flutter_assets`.
- Les noms de fichiers Dart observables et les dépendances observables sont conservés dans `recovery/`. Ce sont des indices d’architecture, pas des sources récupérées.
- Images, icônes Android et bannière TV extraites de l’APK TV. Les icônes macOS sont dérivées de l’icône Android récupérée, avec une résolution source limitée à 192 pixels.

## Fonctions réécrites

- Catalogue des dernières sorties, films, séries, animés et filtres par plateforme.
- Recherche multi-type, pagination et exclusion des résultats de personnes.
- Fiches, saisons et épisodes utilisant le proxy existant, notamment pour ses saisons virtuelles.
- Favoris locaux, historique et reprise distincts par épisode.
- Choix de sources via les contrats des services Web existants, avec tolérance à la panne d’un fournisseur.
- Lecteur `media_kit`, commandes vidéo intégrées, raccourcis clavier et reprise de lecture.
- Téléchargements MP4, HLS VOD (y compris AES-128 standard) et DASH statique non protégé, publication atomique, annulation et lecture hors ligne.
- Service Android de téléchargement avec notification et maintien en activité, PiP sur les appareils compatibles.
- Connexion Trakt par code, stockage sécurisé, renouvellement de session et scrobbling.
- Interface mobile, barre latérale pour ordinateur/TV, focus visible, clavier TV à l’écran et variante Android avec lanceur Leanback.
- Paramètres de langue du catalogue, adresse du service et lecture d’une URL vidéo directe.

## Limites explicites

Cette reconstruction ne restitue pas les fichiers Dart originaux et n’établit pas une parité complète avec les APK.

- Les 12 releases GitHub accessibles vérifiées le 2 novembre 2026 ne contiennent aucun paquet macOS. La version Mac est compilée depuis cette reconstruction.
- L’accueil TV a été comparé visuellement avec l’APK original exécuté en émulateur ; tous les écrans et parcours originaux ne sont pas reproduits à l’identique.
- Les extracteurs directs propres aux APK, Chromecast/AirPlay, actualisation automatique et recherche de sous-titres externes restent à reconstruire. Les pistes embarquées sont disponibles dans les commandes du lecteur.
- Les téléchargements acceptent les fichiers MP4, HLS à la demande et une partie des manifestes DASH statiques (SegmentTemplate/SegmentList). Les flux en direct, DRM et formes de segmentation non prises en charge échouent explicitement.
- Sur Android, le service de téléchargement reste soumis aux limites du système, aux autorisations et aux arrêts forcés. Les fichiers interrompus sont nettoyés au prochain lancement ; la reprise réseau après arrêt n’est pas implémentée. Sur Mac, garder l’application ouverte pendant le téléchargement.
- Les intégrations de sources dépendent des services externes existants. Une requête de contrôle vers `vixsrc` pour TMDB 550 a renvoyé une liste vide ; une lecture vidéo de test réussie ne valide pas les sources de tous les films du catalogue.
- Trakt est testé avec des réponses simulées ; aucune connexion à un compte réel n’a été effectuée.
- Le code de signature d’origine n’est pas récupérable depuis les APK. Les applications reconstruites ont de nouveaux identifiants et une nouvelle clé locale ; elles s’installent séparément des applications d’origine.

## Vérifications

- Analyse Flutter sans anomalie et 24 tests unitaires/de widgets, dont les erreurs réseau, le stockage, la navigation et les titres longs sur petits écrans.
- Trois tests d’intégration sur émulateur Android TV ARM64, également réussis sur macOS : téléchargement de MP4/HLS/DASH, fermeture du serveur source, lecture locale avec rendu vidéo et piste audio, recherche dans la vidéo et persistance de la position.
- Les tests utilisent un extrait de démonstration Flutter et un son synthétique, indépendants des fournisseurs du catalogue. Préparer avec `tool/prepare_media_fixture.py`, transférer vers `/data/local/tmp/anisflix-media`, puis lancer `flutter test integration_test/playback_test.dart -d <device> --flavor tv --dart-define=TV_MODE=true`.
- Test macOS du démarrage réel de l’interface, du chargement du catalogue et d’une recherche TMDB.
- Test macOS de lecture/écriture/suppression d’un élément de test dans le Trousseau, sans connexion à un compte Trakt réel.
- L’application Mac compilée est installée dans `~/Applications/AnisFlix.app` et a été lancée. Son contrôle visuel par Codex nécessite l’autorisation de contrôle de l’écran, actuellement indisponible.
- Une validation sur émulateur ne remplace pas les essais sur les téléphones, téléviseurs et versions Android cibles.

## Développement et compilation

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
