# 🔧 Corrections App Native iOS

## ✅ Problèmes corrigés

### 1. Architecture Ionic Shell (routes /tabs/*)
**Problème** : Les tabs ne fonctionnaient pas, navigation cassée, tabs non sélectionnés visuellement.

**Cause** : Architecture incorrecte avec routes plates au lieu d'une structure Shell Ionic.

**Solution** : Refactorisation complète de `AppNative.tsx` :
- Routes organisées sous `/tabs/*` au lieu de routes à la racine
- Composant `TabsContainer` qui encapsule IonTabs
- Redirect automatique de `/` vers `/tabs/home`
- Routes de détail intégrées dans le même IonRouterOutlet

**Fichiers modifiés** :
- `client/src/AppNative.tsx` - Architecture Shell complète

### 2. Safe Area pour le header (encoche iPhone)
**Problème** : Le header passait derrière l'encoche de l'iPhone (safe area).

**Solution** : Ajout de `paddingTop: 'env(safe-area-inset-top, 20px)'` dans NativePageWrapper.

**Fichiers modifiés** :
- `client/src/components/NativePageWrapper.tsx` - Padding-top avec safe-area

---

## 🎯 Structure des routes natives

### Routes principales (tabs)
```
/tabs/home           → Page d'accueil
/tabs/movies         → Films
/tabs/series         → Séries
/tabs/tv-channels    → TV Direct
/tabs/favorites      → Favoris  
/tabs/settings       → Paramètres
```

### Routes de détail (dans le même outlet)
```
/tabs/movie/:id                → Détail film
/tabs/series/:id               → Détail série
/tabs/latest-movies            → Derniers films
/tabs/popular-movies           → Films populaires
/tabs/netflix-movies           → Films Netflix
/tabs/provider/:id             → Détail plateforme
/tabs/movies-genre/:genre      → Films par genre
... etc
```

---

## 📝 Note importante sur les liens

Les pages sont **partagées** entre AppWeb et AppNative. 

- **AppWeb** utilise des routes comme `/movie/:id`
- **AppNative** utilise des routes comme `/tabs/movie/:id`

### ⚠️ Limitation actuelle
Les liens dans les pages utilisent encore les anciens chemins (sans `/tabs`).

**Impact** :
- ✅ Navigation entre tabs fonctionne (IonTabButton)
- ⚠️ Navigation depuis les pages vers détails peut ne pas fonctionner correctement

### 🔧 Solution à implémenter
Il faudra créer un helper de navigation qui génère les bons chemins selon le mode :
```typescript
// Exemple de helper à créer
const useNavHelper = () => {
  const isNative = window.Capacitor !== undefined;
  
  return {
    moviePath: (id: string) => isNative ? `/tabs/movie/${id}` : `/movie/${id}`,
    seriesPath: (id: string) => isNative ? `/tabs/series/${id}` : `/series/${id}`,
    // etc...
  };
};
```

---

## 🧪 Comment tester sur iOS

### 1. Compiler et lancer l'app
```bash
# Sur votre Mac
npm run dev  # Dans un terminal

# Dans un autre terminal
npx cap sync ios
npx cap open ios
```

### 2. Dans Xcode
1. Sélectionnez votre équipe (Signing)
2. Choisissez un simulateur ou iPhone réel
3. Cliquez sur Play ▶️

### 3. Tests à effectuer

#### ✅ Test de la TabBar
1. Cliquez sur chaque tab (Home, Movies, Series, TV, Favorites, Settings)
2. **Attendu** : Chaque tab s'affiche correctement
3. **Attendu** : Le tab sélectionné est visuellement actif (couleur différente)

#### ✅ Test du Safe Area
1. Vérifiez que le header/SearchBar ne passe PAS derrière l'encoche
2. **Attendu** : Padding au-dessus du contenu visible

#### ✅ Test Pull-to-Refresh
1. Tirez vers le bas sur n'importe quelle page
2. **Attendu** : Spinner visible avec texte selon la langue
3. **Attendu** : Page se recharge après 2 secondes

#### ⚠️ Test Navigation interne
1. Depuis la page Home, cliquez sur un film
2. **À vérifier** : La page de détail s'affiche-t-elle ?
3. Si non, c'est le problème de liens mentionné ci-dessus

#### ✅ Test Mode Offline
1. Activez le mode avion sur l'iPhone
2. **Attendu** : Tabs Movies/Series deviennent grisés (disabled)
3. **Attendu** : Tabs Home/TV/Favorites/Settings restent actifs

---

## 🐛 Si vous rencontrez des problèmes

### Les tabs ne s'affichent toujours pas
- Vérifiez les logs dans Safari → Develop → [Votre iPhone] → App
- Recherchez les erreurs de routing

### Le header passe encore derrière l'encoche
- Vérifiez que `NativePageWrapper` est bien appliqué à toutes les pages
- Vérifiez dans les DevTools que le padding-top s'applique

### La navigation ne fonctionne pas depuis les pages
- C'est le problème connu mentionné ci-dessus
- Il faudra créer le helper de navigation

---

## 📊 État actuel

| Fonctionnalité | État | Notes |
|---|---|---|
| Architecture Ionic Shell | ✅ Implémenté | Routes sous /tabs/* |
| TabBar avec sélection visuelle | ✅ Devrait fonctionner | À tester sur iOS |
| Safe area (encoche) | ✅ Implémenté | Padding-top ajouté |
| Pull-to-refresh | ✅ Déjà implémenté | Déjà testé précédemment |
| Mode Offline | ✅ Déjà implémenté | Disable Movies/Series |
| Navigation interne pages | ⚠️ À vérifier | Peut nécessiter helper |

---

## 🚀 Prochaines étapes (si nécessaire)

Si la navigation interne ne fonctionne pas après test :

1. Créer un hook `useNativeNavigation()` qui retourne les bons chemins
2. Mettre à jour MediaCard pour utiliser ce hook
3. Mettre à jour tous les liens dans les pages

Ou alternativement :

1. Utiliser les composants de navigation Ionic (`IonRouterLink`) dans les pages natives
2. Créer une abstraction qui rend le bon composant Link selon le mode

---

## 📞 Support

Si les problèmes persistent après ces corrections :
1. Vérifier les logs Safari DevTools
2. Vérifier les erreurs dans Xcode Console
3. Prendre des screenshots pour déboguer
