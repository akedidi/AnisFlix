# Mises à jour de la reconstruction Flutter

## Avant / après

La version 0.4.0 ne comportait aucun mécanisme de mise à jour. La version 0.5.0 ajoute une rubrique « Mises à jour » aux paramètres, le numéro installé, une vérification manuelle et une vérification au démarrage désactivable. Une bannière annonce une version compatible ; aucun téléchargement ou remplacement ne se fait sans action utilisateur.

Les anciennes releases Android ne peuvent pas mettre à jour cette reconstruction : les noms de paquet et signatures sont différents. Il serait incorrect de comparer simplement la version Flutter 0.5.0 aux tags Android 1.x ou de prendre `releases/latest` (les anciens tags ne sont pas ordonnés par build réel).

## Canal de publication

Le client parcourt les releases stables publiques de `akedidi/AnisFlix` (pagination), cherche l'asset `anisflix-update.json`, exige `schema: 1`, `track: flutter-reconstruction` et l'identifiant exact de l'application installée. Il choisit la plus grande version sémantique/build compatible, sans rétrogradation du build. Les tags et dates de publication ne servent pas à comparer les versions. Une erreur réseau/GitHub ne devient jamais un message « à jour ».

Le manifeste indique `version`, `build`, puis `platforms.macos`, `platforms.android-mobile` et `platforms.android-tv`, chacun avec `packageId`, `asset`, `size`, `sha256`. Les assets doivent appartenir à la même release HTTPS du dépôt. Brouillons, préversions et autre canal sont exclus. Une release compatible doit être publique.

1. Augmenter version et build dans pubspec.yaml ; conserver les identifiants et la clé de signature Android.
2. Compiler les trois variantes, signer et vérifier macOS, préparer les APK/ZIP finaux dans le dossier des livrables.
3. Exécuter `python3 tool/generate_update_manifest.py /chemin/vers/livrables` avec ANDROID_HOME et le JDK configurés. Le script vérifie identifiants, versions et signatures APK avant de produire le manifeste.
4. Publier les trois paquets et `anisflix-update.json` dans la même release stable GitHub, puis tester depuis la version précédente.

Le code est prêt à lire ce canal, mais **la distribution automatique n'est pas activée tant qu'une release compatible et son manifeste ne sont pas publiés**. La vérification réelle du dépôt actuel doit donc annoncer l'absence de mise à jour compatible. La version 0.4.0 déjà diffusée ne sait pas interroger le nouveau canal : la première installation 0.5.0 est manuelle.

## Téléchargement / installation

- Téléchargement dans le cache privé ; état/progression visible, taille limitée à 1 Gio, délai réseau, suppression du fichier partiel en cas d'échec ; taille et SHA-256 vérifiés avant toute proposition d'installation et à nouveau lors du passage à l'installateur.
- Android : APK limité au sous-dossier de mises à jour, identifiant exact, versionCode strictement supérieur et signataires identiques. FileProvider expose uniquement ce sous-dossier. L'autorisation « installer des applications inconnues » est demandée par Android si nécessaire. Retourner ensuite dans AnisFlix et choisir Installer. L'utilisateur confirme dans l'installateur système ; aucun succès d'installation n'est affirmé à son ouverture.
- macOS : le ZIP vérifié est affiché dans Finder. Décompresser, quitter AnisFlix et remplacer l'app dans Applications. **Pas de remplacement silencieux ni de relance automatique** : l'application actuelle est sandboxée et distribuée avec une signature locale, sans infrastructure Sparkle/notarisation. SHA-256 vérifie l'intégrité par rapport à la release HTTPS ; il ne constitue pas une notarisation Apple.

## Validation

Tests des versions/builds, mauvais identifiants, anciennes releases APK, erreurs GitHub, URL étrangères, métadonnées invalides, téléchargement valide/corrompu et réglage persistant. Les contrôles natifs et la compilation sont consignés dans VALIDATION.md. Une mise à jour de production complète via GitHub ne peut être certifiée avant publication d'une release compatible.

### Reproduire le test natif Android

Utiliser uniquement un émulateur isolé `emulator-5560` : le harnais change l'autorisation d'installation du paquet TV de développement. Avec le SDK/JDK configurés :

1. `flutter build apk --debug --flavor tv --build-name=0.5.1 --build-number=6 --target-platform android-arm64` ; copier l'APK TV de développement dans `work/update-fixtures/compatible.apk` (ne pas l'installer).
2. Faire une copie resignée avec une clé de test distincte dans `work/update-fixtures/wrong-signer.apk`. Ne jamais publier ces fixtures ni leurs clés. Compiler également un APK mobile de production pour le test d'identifiant incompatible.
3. Lancer `python3 tool/serve_update_fixtures.py` dans un terminal. Le serveur écoute seulement 127.0.0.1:18765 ; les routes reset/allow agissent uniquement sur le paquet TV de développement de l'émulateur 5560.
4. `flutter test integration_test/android_updates_test.dart -d emulator-5560 --flavor tv` : ce build utilise version/build de pubspec.yaml ; ceux-ci doivent être strictement inférieurs à la fixture compatible. La fixture same-build est l'APK produit par cette commande.
5. Arrêter le serveur et l'émulateur dédié après le test. Le test confirme l'ouverture de l'installateur système ; la validation d'une installation effective est un contrôle supplémentaire distinct.
