# Vercel deployment trigger


## Application Flutter : Android mobile, Android TV et macOS

Le projet [anisflix_flutter](anisflix_flutter/README.md) contient la reconstruction Flutter des APK Android, avec deux variantes Android (`mobile` et `tv`) et une cible macOS. Il inclut les sources, ressources, tests, dépendances verrouillées et scripts de compilation.

Voir [les instructions](anisflix_flutter/README.md) et [le bilan de validation](anisflix_flutter/recovery/VALIDATION.md). Les fichiers Dart originaux n’ont pas été récupérés ; les fonctions réécrites et les limites de parité sont documentées.

Les clés privées de signature, la configuration TMDB locale, les SDK et les fichiers compilés sont exclus du dépôt. Copier `config.example.json` vers `config.local.json` et installer Flutter avant de compiler.
