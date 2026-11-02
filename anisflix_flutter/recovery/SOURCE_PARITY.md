# Sources Android TV → Flutter macOS

Référence : APK Android TV **1.0.9, build 50**, release `android-v1.0.1-2` du dépôt `akedidi/AnisFlix`. Examen du 2 novembre 2026. Les symboles retenus et le SHA-256 de `libapp.so` sont dans [tv-provider-evidence.txt](tv-provider-evidence.txt).

## Couverture des intégrations

Les 14 familles identifiées sont interrogées par le même `CatalogApi` sur macOS, Android mobile et Android TV. Les six chemins d'animés sont activés pour les animations ; Movix Anime concerne les séries. L'absence de genre sur une entrée de recherche/historique est compensée par la récupération des métadonnées. Chaque famille est couverte par `test/provider_parity_test.dart` avec un lien distinct, pour vérifier la réception effective et pas seulement l'envoi d'une requête.

| Famille TV | Chemin macOS | Traitement |
|---|---|---|
| VixSrc | extraction locale, puis `vixsrc` | API → embed → master signé ; Auto et variantes réellement présentes dans le master |
| MovieBox | `moviebox` | flux et en-têtes conservés, langues et qualités |
| VaPlayer | `vaplayer` | flux et en-têtes conservés |
| YFlix | `yflix` | prise en charge du tableau `results` |
| AfterDark | `afterdark` | tableau `sources` ; lignes de diagnostic exclues |
| FStream | `fstream/movie/{id}` / `fstream/tv/{id}/season/{season}` | langues d'un film ou du seul épisode demandé ; embeds conservés |
| French Stream | `french-provider`, `provider=frenchstream` | flux ou embeds |
| Streamzo | `french-provider`, `provider=streamzo` | flux ou embeds |
| Anime-Sama | `french-provider`, `provider=animesama` | flux ou embeds |
| French-Anime | `french-provider`, `provider=frenchanime` | flux ou embeds |
| AnimePahe | `animepahe` | service serveur existant |
| HiAnime | `hianime` | service serveur existant |
| AnimeAPI | `anime-api` | titre anglais TMDB ; tableau `results` et sous-titres |
| Movix Anime | `anime/search/{title}` | catalogue imbriqué, saison/épisode, tous les hébergeurs renvoyés par le catalogue ; parties de la saison 4 d'Attack on Titan |

Les liens sont affichés dans la fiche du film ou de l'épisode, à droite sur macOS/TV. Les résultats arrivent progressivement. Les erreurs d'un fournisseur n'effacent pas ceux des autres. Le choix VF/VOSTFR/VO est conservé et les liens de langues inconnues sont accessibles dans « Autres ».

Un essai local de lecture d'URL média explicite est aussi effectué pour les hébergeurs inconnus. Les embeds Vidzy/Vidmoly/FSVid disposent d'un essai d'extraction locale puis du repli serveur. Les autres hébergeurs reconnus utilisent `/api/extract`. Les en-têtes de lecture sont transmis au lecteur. Les pistes de sous-titres retournées par les fournisseurs sont conservées et sélectionnables dans le lecteur.

## Contrôle réseau

[Résultat API détaillé](source-audit-live-2026-11-02.json), produit par `python3 tool/audit_sources.py <fichier.json>`. Aucun lien signé ni secret n'est enregistré.

| Exemple | MovieBox | VaPlayer | FStream | French Stream |
|---|---:|---:|---:|---:|
| Film 969681 | 6 | 3 | 17 | 3 |
| Série 1396, S1E1 | 10 | 2 | 10 | 2 |
| Animation 1429, S1E1 | 0 | 3 | 5 | 1 |

Pour ces exemples, le proxy VixSrc, YFlix, AfterDark et Streamzo répondent sans lien. Sur l'animation, Anime-Sama, French-Anime, AnimePahe et AnimeAPI répondent sans lien ; HiAnime renvoie une erreur ; Movix Anime retourne deux candidats de catalogue. Ces résultats sont ponctuels, et ne sont pas des garanties de disponibilité pour tous les titres. VixSrc peut fonctionner localement même lorsque son proxy ne renvoie rien.

## Limites de la vérification

**Couverture des familles ≠ parité de tous les liens ou de la lecture.** Les symboles AOT établissent la présence des intégrations, mais ne restituent pas leur code Dart. Les extracteurs locaux AnimePahe/HiAnime observés dans l'APK ne sont pas reconstruits : macOS dépend pour eux du service serveur. Certains embeds FStream peuvent être listés sans extracteur compatible. Les correspondances de saisons très particulières, les protections réseau et les jetons liés à l'adresse IP peuvent aussi différer.

Le [rapport du test natif macOS](source-audit-macos-2026-11-02.json) contient également les résultats de l'extraction locale, absents du seul contrôle du proxy. Après correction Movix Anime : **33 liens film, 24 épisode, 15 animé**. Le premier passage ne conservait que 9 liens animé ; les six liens Movix supplémentaires étaient supprimés par l'ancien filtre Vidmoly.

Le test natif macOS vérifie l'affichage de liens réels, la position du panneau et les thèmes. Son test réseau collecte des liens pour un film, un épisode et un animé. Il n'affirme pas que chaque lien de chaque fournisseur a été lu. Aucun résultat vide n'est remplacé par un lien fictif.
