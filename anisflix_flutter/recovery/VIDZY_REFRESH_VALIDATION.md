# Vidzy et actualisation du catalogue — 5 novembre 2026

## Vidzy sur macOS

Le flux HLS de « Model Citizen » (TMDB 1792170) laissait lire le début, puis refusait les segments plus loin avec HTTP 403. La page Vidzy établit une session de lecture et ajoute son paramètre `gk` aux requêtes HLS. L’extraction du seul lien signé omettait cette étape.

Le pont macOS utilise maintenant une session WebKit éphémère pour laisser la page du fournisseur établir cette autorisation. Le lecteur reçoit l’URL autorisée et les en-têtes correspondants. Les ressources tierces et les fenêtres publicitaires sont bloquées dans cette session. Les pages présentant directement leur URL vidéo sont également reconnues localement, avec exclusion des liens leurres.

Vérifications : six segments répartis dans le film répondent HTTP 200 après autorisation, dont ceux situés vers 10, 20, 46, 66 et 91 minutes. Le test d’intégration macOS a repris la lecture après des déplacements à 600, 2800, 120 et 5400 secondes, avec image de 867 × 488 et sans image perdue signalée par le moteur. Il crée une nouvelle session à chaque exécution ; aucun jeton signé n’est conservé dans le dépôt.

Test fournisseur volontairement optionnel :

```sh
. ./.toolchain.env
"$FLUTTER_BIN" test integration_test/vidzy_playback_test.dart -d macos \
  --dart-define=VIDZY_EMBED_URL=https://vidzy.live/embed-2235b5pk0zgq.html
```

## Actualisation

Accueil, Films, Séries et Animés proposent un geste vers le bas et un bouton Actualiser. Le loader reste affiché au moins deux secondes et attend les requêtes si elles prennent plus longtemps. Les interactions avec le contenu sont suspendues pendant cette attente, sans bloquer la boucle d’interface Flutter. Les filtres restent sélectionnés et les résultats existants sont conservés si l’actualisation échoue.

Validation : les 147 tests Flutter passent, dont huit tests couvrant les gestes tactiles et à la souris, les filtres, le délai du loader, un réseau lent, les erreurs et la fermeture pendant un chargement. Les tests natifs des sources passent également.

## Livraison locale

La compilation macOS Release a été signée, vérifiée avec `codesign --verify --deep --strict`, installée dans `/Users/anis/Applications/AnisFlix.app` et relancée. Les boutons d’actualisation des quatre onglets ont été contrôlés dans l’application installée, ainsi que la lecture Vidzy. La version précédente est conservée sous `/Users/anis/Applications/.anisflix-backups/20261105-before-vidzy-refresh-cf_xec4r/AnisFlix.app`.
