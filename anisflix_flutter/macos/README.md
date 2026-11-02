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
