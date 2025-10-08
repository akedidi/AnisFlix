# Utilisation du Scraper Vidzy

## Vue d'ensemble

Le scraper Vidzy permet d'extraire automatiquement des liens m3u8 depuis les pages Vidzy en désobfuscant le code JavaScript "packed".

## Architecture

### Backend (Node.js)
- **Fichier**: `server/vidzy-scraper.ts`
- **Fonction principale**: `getVidzyM3u8Link(url: string)`
- **Endpoint API**: `POST /api/vidzy/extract`

### Frontend (React)
- **Fichier**: `client/src/lib/movix.ts`
- **Fonction cliente**: `extractVidzyM3u8(vidzyUrl: string)`

## Utilisation Frontend

```typescript
import { extractVidzyM3u8 } from '@/lib/movix';

// Exemple d'utilisation
const vidzyUrl = 'https://vidzy.org/embed-5rflb5fhc2po.html';

const m3u8Link = await extractVidzyM3u8(vidzyUrl);

if (m3u8Link) {
  console.log('Lien M3U8 extrait:', m3u8Link);
  // Utiliser le lien dans un lecteur vidéo
} else {
  console.error('Impossible d\'extraire le lien m3u8');
}
```

## Utilisation Backend (API directe)

```bash
curl -X POST http://localhost:5000/api/vidzy/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vidzy.org/embed-5rflb5fhc2po.html"}'
```

**Réponse:**
```json
{
  "m3u8Url": "https://example.com/video.m3u8"
}
```

## Fonctionnement technique

1. **Récupération HTML**: Fetch de la page Vidzy avec User-Agent
2. **Extraction du script obfusqué**: Regex pour trouver le bloc `eval(function(p,a,c,k,e,d)...)`
3. **Désobfuscation**: Algorithme de décompression du code packed
4. **Extraction m3u8**: Regex pour trouver l'URL m3u8 dans le code désobfusqué

## Intégration dans les pages de détail

Les liens Vidzy peuvent apparaître dans les réponses des API movix.site. Le scraper peut être utilisé pour extraire automatiquement les liens m3u8 exploitables:

```typescript
// Dans MovieDetail ou SeriesDetail
const handleVidzySource = async (vidzyUrl: string) => {
  const m3u8 = await extractVidzyM3u8(vidzyUrl);
  if (m3u8) {
    // Utiliser le m3u8 dans le lecteur vidéo
    window.open(m3u8, '_blank');
  }
};
```

## Notes importantes

- ⚠️ Le scraping dépend de la structure HTML de Vidzy
- ⚠️ Si Vidzy change son format d'obfuscation, le scraper devra être mis à jour
- ✅ Le désobfuscateur gère le format "packed" standard de JavaScript
- ✅ Fonctionne avec fetch natif (Node.js 18+)
