# Fix Header Z-Index sur Pages Anime

## 🐛 Problème Identifié

Sur certaines pages (notamment les pages anime), le titre apparaissait **au-dessus du header** lors du scroll, créant un effet de superposition indésirable.

**Pages affectées** :
- `/anime-series-popular`
- `/anime-series-latest`
- `/anime-movies-popular`
- `/anime-movies-latest`

## 🔍 Cause Racine

Les pages anime ont leur propre structure de header (n'utilisent pas `CommonLayout`) avec deux problèmes :

1. **Z-index trop faible** : `z-50` au lieu d'un z-index élevé
2. **Variable `scrollY` manquante** : Utilisée dans le className mais non définie, causant une erreur

```tsx
// ❌ Avant
<div className={`sticky top-0 z-50 ... ${scrollY > 10 ? 'shadow-sm' : ''}`}>
// scrollY n'était pas défini !
```

## ✅ Solutions Appliquées

### 1. Ajout de la Variable scrollY

Ajouté un state et un effet pour écouter le scroll :

```typescript
const [scrollY, setScrollY] = useState(0);

// Listen to scroll
useEffect(() => {
  const handleScroll = () => {
    setScrollY(window.scrollY);
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### 2. Augmentation du Z-Index

Changé de `z-50` à `z-[100]` pour garantir que le header reste au-dessus du contenu :

```tsx
// ✅ Après
<div className={`sticky top-0 z-[100] ... ${scrollY > 10 ? 'shadow-sm' : ''}`}>
```

## 📁 Fichiers Modifiés

### 1. `client/src/pages/AnimeSeriesPopular.tsx`
- ✅ Ajout `const [scrollY, setScrollY] = useState(0);`
- ✅ Ajout `useEffect` pour écouter le scroll
- ✅ Z-index : `z-50` → `z-[100]`

### 2. `client/src/pages/AnimeSeriesLatest.tsx`
- ✅ Ajout `const [scrollY, setScrollY] = useState(0);`
- ✅ Ajout `useEffect` pour écouter le scroll
- ✅ Z-index : `z-50` → `z-[100]`

### 3. `client/src/pages/AnimeMoviesPopular.tsx`
- ✅ scrollY déjà défini (ligne 20)
- ✅ useEffect scroll déjà présent (lignes 22-26)
- ✅ Z-index : `z-50` → `z-[100]`

### 4. `client/src/pages/AnimeMoviesLatest.tsx`
- ✅ Ajout `const [scrollY, setScrollY] = useState(0);`
- ✅ Ajout `useEffect` pour écouter le scroll
- ✅ Z-index : `z-50` → `z-[100]`

## 📊 Hiérarchie Z-Index

Après les corrections, voici la hiérarchie des z-index dans l'application :

| Élément | Z-Index | Usage |
|---------|---------|-------|
| Header (CommonLayout) | `z-[1000000]` | Header principal (pages utilisant CommonLayout) |
| Header (Pages Anime) | `z-[100]` | Header des pages anime |
| TabBar (Web Mobile) | `z-[999999]` | TabBar fixe en bas (web mobile) |
| Autres éléments | `z-50` ou moins | Contenu normal |

**Ordre de superposition** (du plus haut au plus bas) :
1. Header CommonLayout (`1000000`)
2. TabBar Web Mobile (`999999`)
3. Headers Pages Anime (`100`)
4. Contenu (`< 50`)

## 🧪 Test

### Avant
1. Ouvrir http://localhost:3000/anime-series-popular
2. Scroller vers le bas
3. ❌ Le titre du premier film/série apparaissait au-dessus du header

### Après
1. Ouvrir http://localhost:3000/anime-series-popular
2. Scroller vers le bas
3. ✅ Le header reste au-dessus de tout le contenu
4. ✅ Pas d'erreur JavaScript dans la console

### Vérification Console

```javascript
// Vérifier le z-index du header
const header = document.querySelector('.sticky.top-0');
const zIndex = window.getComputedStyle(header).zIndex;
console.log('Header z-index:', zIndex); // Devrait être "100"
```

## 📝 Pourquoi z-[100] et pas z-50 ?

Le `z-50` de Tailwind correspond à `z-index: 50` en CSS. Cependant :
- Certains composants (modales, tooltips) utilisent `z-50` ou plus
- Le contenu peut créer de nouveaux contextes de stacking
- `z-[100]` garantit que le header reste au-dessus

**Note** : `z-[100]` utilise la syntaxe Tailwind avec valeur arbitraire pour définir exactement `z-index: 100`.

## 🔧 Bonus : Shadow au Scroll

Le header affiche maintenant correctement une ombre légère après 10px de scroll :

```tsx
${scrollY > 10 ? 'shadow-sm' : ''}
```

Cela améliore la perception de profondeur et indique visuellement que l'utilisateur a scrollé.

## ✅ Résumé

| Problème | Solution | Statut |
|----------|----------|--------|
| scrollY non défini | Ajout state + useEffect | ✅ Corrigé |
| Z-index trop faible | z-50 → z-[100] | ✅ Corrigé |
| Titre au-dessus header | Combinaison des 2 fixes | ✅ Résolu |

## 🚀 Résultat Final

- ✅ Header toujours visible au-dessus du contenu
- ✅ Pas d'erreur JavaScript
- ✅ Shadow au scroll fonctionnel
- ✅ UX améliorée sur toutes les pages anime

Testez maintenant sur http://localhost:3000/anime-series-popular ! 🎉


