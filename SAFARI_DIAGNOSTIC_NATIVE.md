# Diagnostic Safari Web Inspector - Natif iOS

## 🔍 Ouvrir Safari Web Inspector

1. Sur Mac : **Safari > Develop > [Votre iPhone] > localhost**
2. Copier-coller ce script dans la Console :

```javascript
// === DIAGNOSTIC COMPLET DE LA STRUCTURE NATIVE ===
console.log('=== DIAGNOSTIC STRUCTURE IONIC ===');

// 1. Vérifier la présence des éléments Ionic
const ionApp = document.querySelector('ion-app');
const ionTabs = document.querySelector('ion-tabs');
const ionRouterOutlet = document.querySelector('ion-router-outlet');
const ionPage = document.querySelector('ion-page');

console.log('1. STRUCTURE IONIC:', {
  ionApp: !!ionApp,
  ionTabs: !!ionTabs,
  ionRouterOutlet: !!ionRouterOutlet,
  ionPage: !!ionPage
});

// 2. Vérifier IonPage
if (ionPage) {
  const pageStyles = window.getComputedStyle(ionPage);
  console.log('2. ION-PAGE STYLES:', {
    background: pageStyles.background,
    backgroundColor: pageStyles.backgroundColor,
    display: pageStyles.display,
    visibility: pageStyles.visibility,
    opacity: pageStyles.opacity,
    height: pageStyles.height,
    width: pageStyles.width
  });
  console.log('IonPage innerHTML length:', ionPage.innerHTML.length);
  console.log('IonPage children count:', ionPage.children.length);
}

// 3. Chercher le contenu de CommonLayout
const mainContent = document.querySelector('[data-testid="main-content-container"]');
const header = document.querySelector('[data-testid="app-header"]');

console.log('3. COMMONLAYOUT ELEMENTS:', {
  hasHeader: !!header,
  hasMainContent: !!mainContent
});

if (mainContent) {
  const contentStyles = window.getComputedStyle(mainContent);
  console.log('4. MAIN-CONTENT STYLES:', {
    background: contentStyles.backgroundColor,
    color: contentStyles.color,
    display: contentStyles.display,
    visibility: contentStyles.visibility,
    opacity: contentStyles.opacity,
    height: contentStyles.height,
    minHeight: contentStyles.minHeight
  });
  console.log('Main content innerHTML length:', mainContent.innerHTML.length);
  console.log('Main content children count:', mainContent.children.length);
  
  // Lister les premiers enfants
  const children = Array.from(mainContent.children).slice(0, 5);
  console.log('5. FIRST CHILDREN:', children.map(child => ({
    tagName: child.tagName,
    className: child.className,
    visible: window.getComputedStyle(child).visibility === 'visible',
    display: window.getComputedStyle(child).display
  })));
}

// 6. Vérifier si des divs avec du contenu existent
const allDivs = document.querySelectorAll('div');
console.log('6. TOTAL DIVS IN DOM:', allDivs.length);

// Chercher des divs avec du contenu texte significatif
const divsWithContent = Array.from(allDivs).filter(div => {
  const text = div.textContent?.trim() || '';
  return text.length > 20 && text.length < 500;
}).slice(0, 5);

console.log('7. DIVS WITH CONTENT (first 5):', divsWithContent.map(div => ({
  text: div.textContent?.substring(0, 50),
  visible: window.getComputedStyle(div).visibility === 'visible',
  display: window.getComputedStyle(div).display,
  opacity: window.getComputedStyle(div).opacity,
  background: window.getComputedStyle(div).backgroundColor
})));

// 8. Vérifier le data-platform
console.log('8. DATA-PLATFORM:', {
  html: document.documentElement.getAttribute('data-platform'),
  body: document.body.getAttribute('data-platform')
});

// 9. Chercher les carousels ou listes de films
const containers = document.querySelectorAll('.container');
console.log('9. CONTAINERS FOUND:', containers.length);
containers.forEach((container, i) => {
  if (i < 3) {
    const styles = window.getComputedStyle(container);
    console.log(`Container ${i}:`, {
      visible: styles.visibility === 'visible',
      display: styles.display,
      opacity: styles.opacity,
      childrenCount: container.children.length
    });
  }
});

console.log('=== FIN DIAGNOSTIC ===');
```

## 📋 Copier-coller la sortie

Après avoir exécuté le script, **copier toute la sortie de la console** et me la communiquer.

## 🔧 Tests Rapides

Si le diagnostic montre que les éléments existent mais sont invisibles, essayez ces commandes :

```javascript
// Forcer la visibilité de tous les divs
const allDivs = document.querySelectorAll('div');
allDivs.forEach(div => {
  div.style.visibility = 'visible';
  div.style.opacity = '1';
});

// Forcer le background de ion-page à blanc pour voir si du contenu apparaît
const ionPage = document.querySelector('ion-page');
if (ionPage) {
  ionPage.style.background = '#FFFFFF';
  ionPage.style.backgroundColor = '#FFFFFF';
}
```

Si du contenu apparaît après ces commandes, le problème est CSS. Sinon, le problème est le rendu React.


