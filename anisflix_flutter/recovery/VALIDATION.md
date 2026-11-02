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
