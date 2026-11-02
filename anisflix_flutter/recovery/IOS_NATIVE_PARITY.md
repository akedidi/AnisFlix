# Référence actuelle : moteur iOS natif

Depuis **0.4.0**, la liste de liens de l'application Flutter macOS provient du moteur Swift de `ios-natve/anisflix/anisflix/Services`. Le précédent contrôle Android TV de la version 0.3.0 ne suffit pas à prouver cette parité : il incluait des hébergeurs supplémentaires que l'iOS retire.

## Sources

`CatalogApi` appelle le canal macOS `com.anisflix.reconstructed/sources`. Celui-ci utilise directement `StreamingService.fetchSources` ou `fetchSeriesSources` et les services Swift MovieBox, MOB, YFlix, AnimePahe, HiAnime et fournisseurs français. Le filtre de fournisseurs du code iOS est conservé. Les liens rejetés par ce filtre ne sont plus ajoutés depuis la collecte Flutter sur macOS. Aucun repli silencieux vers l'ancien agrégateur Flutter n'est utilisé pour la liste.

La sélection d'un embed appelle aussi `StreamingService.extractDirectLink`. Les pistes, en-têtes, langues, qualités et liens directs sont transmis au lecteur Flutter.

Les adaptations sont consignées dans [ios-native-engine-provenance.json](ios-native-engine-provenance.json), avec le SHA-256 de chaque fichier de référence : configuration TMDB transmise par Flutter, choix du backend, journaux contenant des URL signées désactivés, retrait de deux fonctions inutilisées de navigation/ancien Vidlink. Le délégué URLSession conserve la validation normale des certificats de macOS.

## VF / VOSTFR / VO et ordre

Les règles de `MovieDetailView` / `SeriesDetailView` sont reprises : uniquement trois onglets, priorité VF puis VOSTFR puis VO, classement des fournisseurs identique à `StreamingSourceListOrdering`, qualités décroissantes dans chaque bloc. MovieBox applique la normalisation native : des sous-titres optionnels ne transforment pas une piste VO en VOSTFR. Les libellés et leur numérotation suivent les vues Swift.

[La référence de test](ios-source-list-reference.json) est générée en exécutant les véritables fonctions Swift du dépôt iOS sur un jeu de sources contrôlé. Le test Flutter compare ses catégories, l'ordre et chaque libellé avec cette sortie. Le test du canal vérifie aussi que MOB et MovieBox restent deux fournisseurs et que les en-têtes/pistes ne sont pas perdus.

## Plateformes

Le code iOS `HomeView.providers` contient **14 plateformes**, et non six : Netflix, Amazon Prime, Apple TV+, Paramount+, Disney+, HBO Max, Peacock, Canal+, Crunchyroll, ADN, Arte, MUBI, TF1+, M6+. Leurs logos TMDB sont embarqués localement et affichés en carrés dans une grille responsive. Chaque carré ouvre le catalogue de la plateforme avec le choix Films / Séries. Le filtre des catalogues propose les mêmes 14 entrées. Comme iOS, Amazon Prime et Peacock utilisent la région US ; les autres plateformes utilisent FR.

## Portée

La réutilisation du moteur et la comparaison des règles établissent la correspondance du traitement des sources. Des résultats différents restent possibles entre deux exécutions iOS/macOS selon le titre, la disponibilité des sites, le réseau et les jetons temporaires. Aucun test ne prétend avoir lu tous les liens de tous les fournisseurs.
