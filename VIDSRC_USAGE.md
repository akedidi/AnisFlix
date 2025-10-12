# VidSrc Scraper - Guide d'utilisation

## Vue d'ensemble

Le scraper VidSrc permet d'extraire les liens de streaming (m3u8) depuis [VidSrc.io](https://vidsrc.io), une plateforme qui fournit des liens de streaming pour films et séries.

## Fonctionnalités

### ✅ Implémentées
- Extraction des liens de streaming depuis VidSrc.io
- Support des films et séries
- Extraction directe des liens m3u8
- Détection automatique des lecteurs disponibles
- Interface de test intégrée

### 🎯 Types de contenu supportés
- **Films** : `https://vidsrc.io/embed/movie?tmdb=ID`
- **Séries** : `https://vidsrc.io/embed/tv?tmdb=ID&season=X&episode=Y`

## API Endpoints

### 1. Extraction des liens de streaming
```http
POST /api/vidsrc/extract
Content-Type: application/json

{
  "url": "https://vidsrc.io/embed/movie?tmdb=986097"
}
```

**Réponse :**
```json
{
  "success": true,
  "m3u8Url": "https://example.com/master.m3u8",
  "players": [
    {
      "name": "CloudStream Pro",
      "url": "https://example.com/player1",
      "type": "embed"
    },
    {
      "name": "2Embed",
      "url": "https://example.com/player2",
      "type": "m3u8"
    }
  ]
}
```

### 2. Extraction directe m3u8
```http
POST /api/vidsrc/m3u8
Content-Type: application/json

{
  "url": "https://vidsrc.io/embed/movie?tmdb=986097"
}
```

**Réponse :**
```json
{
  "m3u8Url": "https://example.com/master.m3u8"
}
```

## Utilisation côté client

### Hook React
```typescript
import { useVidSrcMovie, useVidSrcSeries } from '@/hooks/useVidSrc';

// Pour un film
const { data, isLoading, error, extractM3u8 } = useVidSrcMovie(986097);

// Pour une série
const { data, isLoading, error } = useVidSrcSeries(1399, 1, 1);
```

### Fonctions utilitaires
```typescript
import { 
  extractVidSrcStreamingLinks, 
  extractVidSrcM3u8,
  generateVidSrcMovieUrl,
  generateVidSrcSeriesUrl 
} from '@/lib/vidsrc';

// Générer une URL VidSrc
const movieUrl = generateVidSrcMovieUrl(986097);
const seriesUrl = generateVidSrcSeriesUrl(1399, 1, 1);

// Extraire les liens
const result = await extractVidSrcStreamingLinks(movieUrl);
const m3u8Url = await extractVidSrcM3u8(movieUrl);
```

## Interface de test

### Accès
- **URL** : `http://localhost:5000/test-vidsrc`
- **Fonctionnalités** :
  - Test d'extraction de liens
  - Test d'extraction m3u8 directe
  - URLs de test prédéfinies
  - Copie des liens dans le presse-papiers
  - Ouverture directe dans le lecteur

### URLs de test
- Film Test 1 : `https://vidsrc.io/embed/movie?tmdb=986097`
- Fight Club : `https://vidsrc.io/embed/movie?tmdb=550`
- The Dark Knight : `https://vidsrc.io/embed/movie?tmdb=155`

## Script de test en ligne de commande

```bash
# Tester le scraper VidSrc
npm run test:vidsrc
```

Le script teste automatiquement plusieurs URLs et affiche les résultats.

## Intégration dans votre lecteur

### Avec Video.js
```typescript
const m3u8Url = await extractVidSrcM3u8(vidSrcUrl);
if (m3u8Url) {
  player.src({
    src: m3u8Url,
    type: 'application/x-mpegURL'
  });
}
```

### Avec HLS.js
```typescript
const m3u8Url = await extractVidSrcM3u8(vidSrcUrl);
if (m3u8Url) {
  const hls = new Hls();
  hls.loadSource(m3u8Url);
  hls.attachMedia(videoElement);
}
```

## Gestion des erreurs

### Types d'erreurs courantes
- **URL invalide** : L'URL ne contient pas 'vidsrc.io'
- **Contenu non trouvé** : Aucun lien de streaming disponible
- **Timeout** : La requête prend trop de temps
- **Erreur réseau** : Problème de connexion

### Exemple de gestion d'erreur
```typescript
try {
  const result = await extractVidSrcStreamingLinks(url);
  if (!result.success) {
    console.error('Erreur VidSrc:', result.error);
    return;
  }
  // Utiliser result.m3u8Url ou result.players
} catch (error) {
  console.error('Erreur réseau:', error);
}
```

## Limitations

1. **Dépendance VidSrc** : Le scraper dépend de la disponibilité de VidSrc.io
2. **Rate limiting** : VidSrc peut limiter les requêtes fréquentes
3. **Changements d'API** : VidSrc peut modifier sa structure HTML
4. **Géolocalisation** : Certains contenus peuvent être restreints géographiquement

## Maintenance

### Surveillance
- Vérifier régulièrement que VidSrc.io est accessible
- Tester les URLs de test pour détecter les changements
- Surveiller les logs d'erreur du serveur

### Mise à jour
- Adapter les sélecteurs HTML si VidSrc change sa structure
- Mettre à jour les User-Agents si nécessaire
- Ajouter de nouveaux types de lecteurs si disponibles

## Exemples d'utilisation

### Intégration dans StreamingSources
```typescript
// Ajouter VidSrc comme source de streaming
const vidSrcResult = await extractVidSrcStreamingLinks(vidSrcUrl);
if (vidSrcResult.success && vidSrcResult.m3u8Url) {
  allSources.push({
    id: 'vidsrc-m3u8',
    name: 'VidSrc (m3u8)',
    provider: 'vidsrc',
    url: vidSrcResult.m3u8Url,
    type: 'm3u8',
    isVidSrc: true
  });
}
```

### Fallback avec autres sources
```typescript
// Essayer VidSrc en premier, puis fallback sur d'autres sources
let m3u8Url = await extractVidSrcM3u8(vidSrcUrl);
if (!m3u8Url) {
  m3u8Url = await extractVidzyM3u8(vidzyUrl);
}
if (!m3u8Url) {
  // Utiliser d'autres sources...
}
```

## Support

Pour toute question ou problème :
1. Vérifiez les logs du serveur
2. Testez avec l'interface `/test-vidsrc`
3. Exécutez le script de test `npm run test:vidsrc`
4. Consultez la documentation VidSrc.io
