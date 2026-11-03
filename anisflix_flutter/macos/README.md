# Application macOS AnisFlix

Cette cible fait partie du projet Flutter `anisflix_flutter` dans le dépôt AnisFlix. L'interface et le lecteur sont dans `../lib/` ; `Runner/` contient la fenêtre macOS, les droits de l'application et le moteur de sources Swift partagé avec iOS.

Depuis la racine du dépôt :

```sh
cd anisflix_flutter
flutter pub get
cp config.example.json config.local.json
# Renseigner TMDB_API_KEY dans config.local.json.
tool/run-local.sh macos
```

Pour compiler l'application : `tool/build.sh macos`. Le bundle est produit dans `build/macos/Build/Products/Release/AnisFlix.app`. Le projet Xcode est `macos/Runner.xcworkspace` ; utiliser les commandes Flutter pour préparer ses dépendances.

Pour vérifier la taille du lecteur avec une vidéo locale de démonstration :

```sh
fixture_dir="$HOME/Library/Containers/com.anisflix.reconstructed.anisflixFlutter/Data/tmp/anisflix-media"
python3 tool/prepare_media_fixture.py "$fixture_dir"
flutter test integration_test/player_layout_test.dart -d macos \
  --dart-define=FIXTURE_DIR="$fixture_dir"
```

La vidéo est placée dans le conteneur de l'application pour respecter la sandbox macOS. Ce test ouvre le véritable écran du lecteur, vérifie que la vidéo occupe sa surface dès l'ouverture et pendant la lecture, puis redimensionne le lecteur en paysage et en portrait. Il enregistre aussi une capture du rendu Flutter dans le répertoire temporaire de l'application.

Les boutons **Image dans l’image**, **Sous-titres et décalage** et **Format d’image** se trouvent en bas à droite de la barre de commandes, y compris en plein écran. Le format peut être **Original**, **16:9**, **4:3** ou **Étiré** ; il est mémorisé sans interrompre la lecture.

Le menu de sous-titres donne accès aux pistes de la vidéo et du fournisseur, au décalage signé et à la taille du texte. Un décalage positif affiche les sous-titres plus tard ; un décalage négatif les avance. La taille est mémorisée ; le décalage est propre à la lecture courante.

Le bouton **Image dans l'image** transforme la fenêtre en lecteur flottant redimensionnable, au-dessus des autres applications. La vidéo, ses sous-titres et sa position restent dans le même lecteur. Les commandes **−10 s**, **Lecture/Pause** et **+10 s** sont centrées dans la fenêtre. Le bouton **Revenir au lecteur** reste en bas à droite. Ce bouton, Échap ou le bouton de fermeture de cette petite fenêtre restaurent la fenêtre normale. Il s'agit d'une fenêtre macOS flottante gérée par AnisFlix.

Pour vérifier les quatre formats d’image, le retour au format original, le plein écran, les pistes embarquées et du fournisseur, leur décalage réel et le passage en PiP (après la préparation de la fixture ci-dessus) :

```sh
flutter test integration_test/player_features_test.dart -d macos \
  --dart-define=FIXTURE_DIR="$fixture_dir"
```
