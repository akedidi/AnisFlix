# Diagnostic iOS Native - Écran Noir

## 🧪 Test avec Page Minimaliste

J'ai créé une **page de test rouge** (`TestNative.tsx`) pour identifier où se situe le problème.

### Étape 1 : Tester la page minimaliste

```bash
npx cap open ios
```

Puis dans Xcode : **Product > Run (⌘R)**

### Étape 2 : Vérifier ce qui s'affiche

**Scénario A : Vous voyez un écran ROUGE avec du texte blanc**
- ✅ La structure Ionic fonctionne (IonApp, IonTabs, IonPage)
- ❌ Le problème est dans `CommonLayout` ou `IonicPullToRefresh`
- **Action** : Simplifier CommonLayout pour natif

**Scénario B : L'écran reste NOIR**
- ❌ Problème structurel dans Ionic
- Le composant ne se rend pas du tout
- **Action** : Vérifier les logs et la structure des wrappers

### Étape 3 : Vérifier les logs dans Xcode Console

Recherchez ces logs :
```
🚀 [AppNative] Rendering AppNative component
✅ [PageWrapper] Wrapping dans IonPage pour animations natives
🧪 [TestNative] Component rendering
```

**Si vous voyez ces 3 logs** : Le composant se rend, mais n'est pas visible
**Si vous ne voyez pas le dernier log** : Le composant ne se rend pas

### Étape 4 : Safari Web Inspector (si écran noir)

1. Sur Mac : **Develop > [Votre iPhone] > localhost**
2. Dans la console, exécutez :

```javascript
// Vérifier la structure DOM
console.log('IonApp:', document.querySelector('ion-app'));
console.log('IonPage:', document.querySelector('ion-page'));
console.log('TestNative div:', document.querySelector('div[style*="FF0000"]'));

// Vérifier les styles appliqués
const ionPage = document.querySelector('ion-page');
if (ionPage) {
  const styles = window.getComputedStyle(ionPage);
  console.log('IonPage styles:', {
    background: styles.background,
    display: styles.display,
    visibility: styles.visibility,
    opacity: styles.opacity,
    height: styles.height
  });
}

// Chercher tous les divs
const allDivs = document.querySelectorAll('div');
console.log('Total divs found:', allDivs.length);
allDivs.forEach((div, i) => {
  const computed = window.getComputedStyle(div);
  if (div.textContent?.includes('TEST NATIVE')) {
    console.log(`DIV ${i} (TEST NATIVE):`, {
      visible: computed.visibility === 'visible',
      opacity: computed.opacity,
      display: computed.display,
      background: computed.backgroundColor,
      color: computed.color,
      text: div.textContent.substring(0, 50)
    });
  }
});
```

## 📊 Résultats Attendus

### Si la page rouge s'affiche :
- Le problème est isolé à `CommonLayout`
- Solution : Retirer `IonicPullToRefresh` temporairement ou simplifier la structure

### Si l'écran reste noir :
- Le problème est plus profond (Ionic ou PageWrapper)
- Vérifier que `data-platform="native-mobile"` est bien défini sur `<html>`

## 🔧 Solutions selon le diagnostic

### Solution 1 : Simplifier CommonLayout
Si la page rouge s'affiche, le problème est dans CommonLayout. Je vais :
1. Retirer le wrapper dans `IonicPullToRefresh`
2. Retirer les styles CSS agressifs sur `.ion-content-native`
3. Utiliser une structure plus simple sans IonContent

### Solution 2 : Corriger PageWrapper
Si l'écran reste noir, le problème est dans PageWrapper ou IonPage :
1. Retirer IonPage temporairement pour tester
2. Vérifier que le background `#000000` n'est pas le problème (essayer avec #1a1a1a)
3. Forcer `min-height: 100vh` sur le contenu

### Solution 3 : Problème de z-index/stacking
Si le contenu existe dans le DOM mais n'est pas visible :
1. Vérifier les `z-index` de tous les éléments
2. Retirer les `transform` qui créent de nouveaux contextes
3. Forcer `position: relative` sur les parents

## 📝 Me communiquer

Après avoir testé, indiquez-moi :
1. **Voyez-vous l'écran rouge ?** (Oui/Non)
2. **Les 3 logs apparaissent-ils ?** (Oui/Non/Seulement 1-2)
3. **Résultat de la commande Safari Web Inspector** (copier-coller)

Je pourrai alors appliquer la solution précise.



