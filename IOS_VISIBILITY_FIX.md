# Fix Visibilité Header et Contenu iOS Natif

## Problème
✅ TabBar visible
❌ Header invisible
❌ Contenu invisible

## Corrections appliquées

### 1. IonicPullToRefresh.tsx
- Ajout de la classe `ion-content-native`
- Suppression des styles CSS variables qui causaient des problèmes
- Logs de debug ajoutés

### 2. index.css
```css
/* Forcer la visibilité du contenu dans IonContent natif */
.ion-content-native {
  --background: #000000;
  color: #ffffff;
}

.ion-content-native .container,
.ion-content-native > div,
.ion-content-native header {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.native-only {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  color: #ffffff !important;
}
```

### 3. CommonLayout.tsx
- Header avec styles inline pour forcer la visibilité :
  - `backgroundColor: '#000000'`
  - `color: '#ffffff'`
  - `data-testid="app-header"`

- Container avec styles inline :
  - `display: 'block'`
  - `visibility: 'visible'`
  - `opacity: 1`
  - `color: '#ffffff'`
  - `data-testid="main-content-container"`

## Pour tester

1. **Recharger dans Xcode** (⌘R)

2. **Ouvrir Safari Web Inspector** et exécuter :
```javascript
// Vérifier le header
const header = document.querySelector('[data-testid="app-header"]');
console.log('Header:', {
  exists: !!header,
  display: header ? window.getComputedStyle(header).display : null,
  visibility: header ? window.getComputedStyle(header).visibility : null,
  opacity: header ? window.getComputedStyle(header).opacity : null,
  backgroundColor: header ? window.getComputedStyle(header).backgroundColor : null,
  rect: header?.getBoundingClientRect()
});

// Vérifier le container
const container = document.querySelector('[data-testid="main-content-container"]');
console.log('Container:', {
  exists: !!container,
  display: container ? window.getComputedStyle(container).display : null,
  visibility: container ? window.getComputedStyle(container).visibility : null,
  opacity: container ? window.getComputedStyle(container).opacity : null,
  color: container ? window.getComputedStyle(container).color : null,
  innerHTML: container ? container.innerHTML.substring(0, 100) : null
});

// Vérifier IonContent
const ionContent = document.querySelector('.ion-content-native');
console.log('IonContent:', {
  exists: !!ionContent,
  className: ionContent?.className,
  childElementCount: ionContent?.childElementCount,
  innerHTML: ionContent ? ionContent.innerHTML.substring(0, 100) : null
});
```

3. **Vérifier dans les logs** :
```
✅ [IonicPullToRefresh] Rendering IonContent for native
📋 Header existe et est visible
📦 Container existe et est visible
```

## Si toujours invisible

Exécuter ce script de diagnostic complet :
```javascript
(function() {
  console.log('🔍 DIAGNOSTIC VISIBILITÉ');
  
  // 1. Structure DOM
  const ionContent = document.querySelector('ion-content');
  const ionPage = document.querySelector('ion-page');
  const header = document.querySelector('header, [data-testid="app-header"]');
  const container = document.querySelector('[data-testid="main-content-container"]');
  
  console.log('Structure:', {
    ionPage: !!ionPage,
    ionContent: !!ionContent,
    header: !!header,
    container: !!container
  });
  
  // 2. Styles computed
  if (header) {
    const s = window.getComputedStyle(header);
    console.log('Header styles:', {
      display: s.display,
      visibility: s.visibility,
      opacity: s.opacity,
      position: s.position,
      top: s.top,
      zIndex: s.zIndex,
      backgroundColor: s.backgroundColor,
      color: s.color
    });
  }
  
  if (container) {
    const s = window.getComputedStyle(container);
    console.log('Container styles:', {
      display: s.display,
      visibility: s.visibility,
      opacity: s.opacity,
      color: s.color,
      paddingTop: s.paddingTop,
      paddingBottom: s.paddingBottom
    });
  }
  
  // 3. Contenu réel
  if (container) {
    const children = container.querySelectorAll('*');
    console.log('Contenu du container:', {
      childCount: children.length,
      firstChild: children[0]?.tagName,
      hasText: container.textContent?.length > 0
    });
  }
  
  console.log('✅ FIN DIAGNOSTIC');
})();
```

## Résultats attendus

Après ces corrections, vous devriez voir :
- ✅ TabBar en bas (noir avec icônes blanches)
- ✅ Header en haut (noir avec SearchBar blanc)
- ✅ Contenu visible (films, séries, etc.)
- ✅ Scroll fonctionne
- ✅ Tout est en blanc sur fond noir



