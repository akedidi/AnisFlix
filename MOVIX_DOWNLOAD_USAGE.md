# Intégration API MovixDownload

## Vue d'ensemble

L'intégration de l'API MovixDownload permet de récupérer des sources de streaming de haute qualité depuis le provider Darkibox avec différentes qualités et langues.

## API Endpoints

### Films
```
GET https://api.movix.site/api/films/download/{tmdb_id}
```

### Séries
```
GET https://api.movix.site/api/series/download/{tmdb_id}/season/{season}/episode/{episode}
```

## Structure des données

```typescript
interface MovixDownloadSource {
  src: string;        // URL de l'embed Darkibox
  language: string;   // Langue (MULTI, FRE, ENG)
  quality: string;    // Qualité (360p, 720p, 4K)
  m3u8: string;       // Lien direct m3u8 pour le streaming
}

interface MovixDownloadResponse {
  sources: MovixDownloadSource[];
}
```

## Hooks React

### useMovixDownload
Hook principal pour récupérer les sources de streaming.

```typescript
const { data, isLoading, error } = useMovixDownload(type, id, season?, episode?);
```

### useMovixDownloadMovie
Hook spécialisé pour les films.

```typescript
const { data, isLoading, error } = useMovixDownloadMovie(tmdbId);
```

### useMovixDownloadSeries
Hook spécialisé pour les séries.

```typescript
const { data, isLoading, error } = useMovixDownloadSeries(tmdbId, season, episode);
```

## Intégration dans StreamingSources

Les sources MovixDownload sont automatiquement intégrées dans le composant `StreamingSources` :

1. **Priorité** : Affichées après TopStream et avant FStream
2. **Langue** : Uniquement en VF (Version Française)
3. **Affichage** : Badges pour la qualité et la langue
4. **Provider** : Identifié comme "Darkibox"

### Exemple d'affichage
```
🎬 Darkibox 4K (Multi) [Darkibox] [4K] [MULTI]
🎬 Darkibox 720p (Multi) [Darkibox] [720p] [MULTI]
🎬 Darkibox 360p (Multi) [Darkibox] [360p] [MULTI]
```

## Qualités disponibles

- **360p** : Qualité standard
- **720p** : Qualité HD
- **4K** : Qualité Ultra HD

## Langues disponibles

- **MULTI** : Multilingue (Français + Anglais)
- **FRE** : Français uniquement
- **ENG** : Anglais uniquement

## Tests

### Script de test
```bash
npm run test:movix-download
```

### Interface de test
Accédez à `/test-movix-download` pour tester l'interface utilisateur.

## Exemples d'utilisation

### Film
```typescript
// ID TMDB: 164177
const { data } = useMovixDownloadMovie(164177);

// Résultat: 5 sources avec qualités 360p, 720p, 4K
```

### Série
```typescript
// ID TMDB: 2160050, Saison 1, Épisode 1
const { data } = useMovixDownloadSeries(2160050, 1, 1);

// Résultat: Sources disponibles pour cet épisode
```

## Avantages

1. **Qualité élevée** : Sources 4K disponibles
2. **Multilingue** : Support français et anglais
3. **Fiabilité** : Provider Darkibox stable
4. **Performance** : Liens m3u8 directs
5. **Intégration** : Compatible avec le lecteur vidéo existant

## Limitations

1. **Disponibilité** : Pas tous les contenus ont des sources
2. **Langue** : Uniquement VF dans l'interface actuelle
3. **Séries** : Certains épisodes peuvent ne pas avoir de sources

## Debug

Les logs de debug sont disponibles dans la console :
- `[MovixDownload] Fetching: {url}`
- `[MovixDownload] Found {count} sources`
- `[MovixDownload] No sources found`

## Support

Pour les problèmes ou questions :
1. Vérifier les logs de debug
2. Tester avec le script `npm run test:movix-download`
3. Utiliser l'interface de test `/test-movix-download`
