# Référence actuelle : moteur iOS natif

Depuis **0.4.0**, la liste de liens de l'application Flutter macOS provient du moteur Swift de `ios-natve/anisflix/anisflix/Services`. Le précédent contrôle Android TV de la version 0.3.0 ne suffit pas à prouver cette parité : il incluait des hébergeurs supplémentaires que l'iOS retire.

## Sources

`CatalogApi` appelle le canal macOS `com.anisflix.reconstructed/sources`. Celui-ci utilise directement `StreamingService.fetchSources` ou `fetchSeriesSources` et les services Swift MovieBox, MOB, YFlix, AnimePahe, HiAnime et fournisseurs français. Le filtre de fournisseurs du code iOS est conservé. Les liens rejetés par ce filtre ne sont plus ajoutés depuis la collecte Flutter sur macOS. Aucun repli silencieux vers l'ancien agrégateur Flutter n'est utilisé pour la liste.

La sélection d'un embed appelle aussi `StreamingService.extractDirectLink`. Les pistes, en-têtes, langues, qualités et liens directs sont transmis au lecteur Flutter.

French-Anime utilise aussi son index public `sitemap.xml` lorsque le formulaire de recherche ne répond pas. Les anciennes fiches avec préfixe `x-`, élisions françaises et suffixes de saison numériques sont reconnues, et les liens de lecteurs commençant par `//` sont acceptés. Le numéro de saison reste obligatoire pour éviter de proposer un épisode d’une autre saison. Vérification du 3 novembre 2026 : une source VF récupérée pour L’Attaque des Titans S3E1 ; la fiche S4 référencée par cet index répond 404 et aucun lien S4E30 n’a été trouvé chez ce fournisseur.

Les adaptations sont consignées dans [ios-native-engine-provenance.json](ios-native-engine-provenance.json), avec le SHA-256 de chaque fichier de référence : configuration TMDB transmise par Flutter, choix du backend, journaux contenant des URL signées désactivés, retrait de deux fonctions inutilisées de navigation/ancien Vidlink. Le délégué URLSession conserve la validation normale des certificats de macOS.

## VF / VOSTFR / VO et ordre

Les règles de `MovieDetailView` / `SeriesDetailView` sont reprises : uniquement trois onglets, priorité VF puis VOSTFR puis VO, classement des fournisseurs identique à `StreamingSourceListOrdering`, qualités décroissantes dans chaque bloc. MovieBox applique la normalisation native : des sous-titres optionnels ne transforment pas une piste VO en VOSTFR. Les libellés et leur numérotation suivent les vues Swift.

Le lecteur fusionne les pistes du fournisseur avec `StreamingService.fetchImdbId` puis `getSubtitles`, comme les vues natives. macOS appelle ces méthodes Swift via le canal `subtitles` ; Android suit les mêmes routes TMDB puis `opensubtitles-v3.strem.io/subtitles/movie/{imdbId}.json` ou `series/{imdbId}:{season}:{episode}.json`. Les pistes embarquées restent sélectionnables, les versions d’une même langue sont conservées (seuls les doublons d’URL sont retirés). La recherche démarre sans retarder la vidéo et le menu réutilise la requête ou la liste en mémoire pour cet épisode.

[La référence de test](ios-source-list-reference.json) est générée en exécutant les véritables fonctions Swift du dépôt iOS sur un jeu de sources contrôlé. Le test Flutter compare ses catégories, l'ordre et chaque libellé avec cette sortie. Le test du canal vérifie aussi que MOB et MovieBox restent deux fournisseurs et que les en-têtes/pistes ne sont pas perdus.

## Plateformes

Le code iOS `HomeView.providers` contient **14 plateformes** : Netflix, Amazon Prime, Apple TV+, Paramount+, Disney+, HBO Max, Peacock, Canal+, Crunchyroll, ADN, Arte, MUBI, TF1+, M6+. Leurs logos TMDB sont embarqués localement et affichés en carrés dans une grille sur deux lignes. Chaque carré ouvre les huit rangées de `ProviderMediaListView`, dans le même ordre : Films, Séries, Films d'Action (28), Films de Drame (18), Films de Comédie (35), Séries d'Action (10759), Séries de Drame (18), Séries de Comédie (35). Les rangées présentent les dix premiers titres après filtrage et les catégories vides sont masquées.

Les quatre requêtes `TMDBService` sont reprises pour les rangées et « Voir tout » :

| Catégorie | Tri demandé à TMDB | Contraintes de sortie supplémentaires |
| --- | --- | --- |
| Films | `release_date.desc` | `release_date.lte`, `with_release_type=4\|5` |
| Séries | `popularity.desc` | `first_air_date.lte` |
| Films avec genre | `primary_release_date.desc` | Aucune dans la requête, filtrage local comme iOS |
| Séries avec genre | `first_air_date.desc` | `first_air_date.lte` |

Toutes combinent `with_watch_providers`, `with_watch_monetization_types=flatrate` et, si nécessaire, `with_genres`. Amazon Prime et Peacock utilisent US ; les autres plateformes FR. La borne des dates suit `ReleaseDateUtils.maxReleasedDateString(sameDayCutoffHour: 12)` : hier avant midi à Paris, aujourd’hui à partir de midi, avec les changements d’heure de `Europe/Paris`. Après réception, les titres sans date ou datés après le jour courant sont exclus et chaque page est triée par date décroissante, comme les vues Swift. La pagination conserve ces paramètres. « Voir tout » affiche la catégorie dans la barre du haut, sans titre générique ni sélecteur de plateforme supplémentaire.

La [référence des requêtes](ios-provider-catalog-reference.json) contient les catégories extraites de la vue et les URL capturées en exécutant les quatre méthodes Swift, sans accès réseau, avec une clé factice. Elle couvre les pages 1/2, FR/US, et le passage à midi en hiver et en été. Les empreintes SHA-256 identifient les fichiers iOS utilisés. Régénération : `python3 tool/generate_ios_provider_catalog_reference.py /chemin/vers/ios-natve/anisflix/anisflix`. Les tests Flutter comparent tous les paramètres avec cette référence et vérifient les huit parcours « Voir tout », les aperçus de dix titres, la pagination, les catégories vides, les erreurs et le changement de langue.

## Portée

La réutilisation du moteur et la comparaison des règles établissent la correspondance du traitement des sources. Des résultats différents restent possibles entre deux exécutions iOS/macOS selon le titre, la disponibilité des sites, le réseau et les jetons temporaires. Aucun test ne prétend avoir lu tous les liens de tous les fournisseurs.
