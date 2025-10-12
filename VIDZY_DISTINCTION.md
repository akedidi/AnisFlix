# Distinction des Sources VIDZY

## Problème Résolu

Dans l'API FStream, quand on a déjà un lien dans `vfq` ou `vff` et qu'on a aussi un lien dans `default` pour VIDZY, il faut distinguer les sources avec des mentions `vidzy1`, `vidzy2`, etc.

## Solution Implémentée

### Modifications dans `StreamingSources.tsx`

La logique a été modifiée pour traiter chaque clé de source séparément et attribuer des numéros distincts aux sources VIDZY :

#### Pour les Films (Sources principales)
- **VFF** : Sources nommées `Vidzy1 (VFF)`, `Vidzy2 (VFF)`, etc.
- **VFQ** : Sources nommées `Vidzy3 (VFQ)`, `Vidzy4 (VFQ)`, etc.
- **Default** : Sources nommées `Vidzy5 (Default)`, `Vidzy6 (Default)`, etc.
- **VOSTFR** : Sources nommées `Vidzy1 (VOSTFR)`, `Vidzy2 (VOSTFR)`, etc.

#### Pour les Épisodes de Séries
- Même logique appliquée aux épisodes avec un compteur séparé
- Sources nommées `Vidzy1 (VFF)`, `Vidzy2 (Default)`, etc.

### Exemple de Résultat

Avant la modification :
```
- Vidzy (1080p)
- Vidzy (720p)
- Vidzy (480p)
```

Après la modification :
```
- Vidzy1 (VFF) - 1080p
- Vidzy2 (VFF) - 720p
- Vidzy3 (VFQ) - 1080p
- Vidzy4 (Default) - 720p
- Vidzy5 (Default) - 480p
```

## Structure des Données

### Propriétés Ajoutées
- `sourceKey` : Indique la clé d'origine (VFF, VFQ, Default, VOSTFR)
- `isEpisode` : Indique si c'est une source d'épisode (pour les séries)

### ID Uniques
- Films : `fstream-vidzy-{key}-{counter}`
- Épisodes : `fstream-episode-vidzy-{key}-{counter}`

## Tests

### Composant de Test
Un composant de test a été créé : `VidzyDistinctionTest.tsx`

**Accès** : `/test-vidzy-distinction`

### Fonctions de Test
- `testVidzyDistinction()` : Test des sources principales
- `testEpisodeVidzyDistinction()` : Test des sources d'épisodes
- `runVidzyDistinctionTests()` : Exécution complète des tests

### Données de Test
Le fichier `testVidzyDistinction.ts` contient des données simulées pour tester la logique :

```typescript
const testFStreamData = {
  players: {
    VFF: [/* sources VIDZY */],
    VFQ: [/* sources VIDZY */],
    Default: [/* sources VIDZY */],
    VOSTFR: [/* sources VIDZY */]
  },
  episodes: {
    '1': {
      languages: {
        VFF: [/* sources VIDZY */],
        Default: [/* sources VIDZY */]
      }
    }
  }
};
```

## Utilisation

### Dans l'Interface
Les sources sont maintenant clairement distinguées dans l'interface utilisateur :

1. **Films** : Chaque source VIDZY affiche son numéro et sa clé d'origine
2. **Séries** : Même logique pour les épisodes
3. **Navigation** : Les utilisateurs peuvent facilement identifier la source qu'ils préfèrent

### Dans le Code
```typescript
// Exemple d'utilisation
const sources = allSources.filter(source => source.isFStream);
sources.forEach(source => {
  console.log(`${source.name} - ${source.sourceKey}`);
});
```

## Avantages

1. **Clarté** : Les utilisateurs savent d'où vient chaque source
2. **Choix** : Possibilité de choisir entre différentes sources VIDZY
3. **Debugging** : Plus facile d'identifier les problèmes de source
4. **Flexibilité** : Support de nouvelles clés de source à l'avenir

## Compatibilité

- ✅ Compatible avec l'API FStream existante
- ✅ Rétrocompatible avec les sources existantes
- ✅ Fonctionne pour les films et les séries
- ✅ Support des langues VF et VOSTFR

## Maintenance

Pour ajouter de nouvelles clés de source :

1. Modifier le filtre dans `StreamingSources.tsx`
2. Ajouter les données de test dans `testVidzyDistinction.ts`
3. Tester avec le composant de test
4. Mettre à jour cette documentation
