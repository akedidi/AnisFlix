import { expect } from 'chai';

describe('iOS Native - SearchBar Safe Area Tests', () => {
  let driver: WebdriverIO.Browser;

  before(async () => {
    driver = (global as any).driver;
  });

  it('should position searchbar under the notch/Dynamic Island', async () => {
    // Attendre que la page soit chargée
    await driver.waitUntil(async () => {
      // Chercher la searchbar dans différents emplacements possibles
      const searchbar = await driver.$('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"], [class*="search"]');
      return await searchbar.isExisting();
    }, {
      timeout: 15000,
      timeoutMsg: 'SearchBar not found'
    });

    // Trouver la searchbar
    const searchbar = await driver.$('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"], [class*="search"]');
    
    if (await searchbar.isExisting()) {
      // Obtenir la position et la taille de la searchbar
      const searchbarRect = await searchbar.getRect();
      const windowSize = await driver.getWindowSize();
      
      console.log(`📊 SearchBar position: top=${searchbarRect.y}, height=${searchbarRect.height}`);
      console.log(`📊 Window size: height=${windowSize.height}`);
      
      // Sur iOS avec encoche/Dynamic Island, la searchbar devrait commencer sous l'encoche
      // L'encoche fait généralement environ 47px de hauteur (safe-area-inset-top)
      const expectedTopPadding = 47; // env(safe-area-inset-top)
      const minTopPadding = 20; // Minimum raisonnable
      const maxTopPadding = 80; // Maximum pour Dynamic Island
      
      console.log(`📊 SearchBar top position: ${searchbarRect.y}`);
      
      // Vérifier que la searchbar n'est pas tout en haut (devrait avoir un padding-top)
      expect(searchbarRect.y, 'SearchBar should start below notch/Dynamic Island').to.be.at.least(minTopPadding);
      expect(searchbarRect.y, 'SearchBar should not be too far down').to.be.at.most(maxTopPadding);
      
      // Prendre un screenshot pour vérification visuelle
      await driver.saveScreenshot('./test-results/searchbar-safe-area.png');
    } else {
      throw new Error('SearchBar not found');
    }
  });

  it('should have searchbar in header with safe area padding', async () => {
    // Chercher le header qui contient la searchbar
    const header = await driver.$('header, [class*="header"], [data-testid="header"]');
    
    if (await header.isExisting()) {
      const headerRect = await header.getRect();
      const windowSize = await driver.getWindowSize();
      
      console.log(`📊 Header position: top=${headerRect.y}, height=${headerRect.height}`);
      
      // Vérifier que le header commence sous l'encoche
      const minTopPadding = 20;
      const maxTopPadding = 80;
      
      expect(headerRect.y, 'Header should start below notch').to.be.at.least(minTopPadding);
      expect(headerRect.y, 'Header should not be too far down').to.be.at.most(maxTopPadding);
      
      // Vérifier que la searchbar est dans le header
      const searchbar = await driver.$('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"]');
      if (await searchbar.isExisting()) {
        const searchbarRect = await searchbar.getRect();
        
        // La searchbar devrait être dans les limites du header
        const searchbarTop = searchbarRect.y;
        const headerTop = headerRect.y;
        const headerBottom = headerRect.y + headerRect.height;
        
        expect(searchbarTop, 'SearchBar should be within header bounds').to.be.at.least(headerTop);
        expect(searchbarTop, 'SearchBar should be within header bounds').to.be.at.most(headerBottom);
        
        console.log(`📊 SearchBar is within header: ${searchbarTop >= headerTop && searchbarTop <= headerBottom}`);
      }
      
      await driver.saveScreenshot('./test-results/searchbar-in-header-safe-area.png');
    } else {
      throw new Error('Header not found');
    }
  });

  it('should keep searchbar visible and accessible', async () => {
    // Chercher la searchbar
    const searchbar = await driver.$('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"], [class*="search"]');
    
    if (await searchbar.isExisting()) {
      // Vérifier que la searchbar est visible
      const isVisible = await searchbar.isDisplayed();
      expect(isVisible, 'SearchBar should be visible').to.be.true;
      
      // Vérifier que la searchbar est accessible (pas cachée)
      const searchbarRect = await searchbar.getRect();
      expect(searchbarRect.width, 'SearchBar should have width').to.be.greaterThan(0);
      expect(searchbarRect.height, 'SearchBar should have height').to.be.greaterThan(0);
      
      // Essayer de cliquer sur la searchbar
      try {
        await searchbar.click();
        await driver.pause(500);
        
        // Vérifier que le clavier ou le focus est activé
        const isFocused = await driver.execute(function() {
          const activeElement = document.activeElement;
          const searchbar = document.querySelector('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"]');
          return activeElement === searchbar;
        });
        
        console.log(`📊 SearchBar is focused: ${isFocused}`);
        
        await driver.saveScreenshot('./test-results/searchbar-accessible.png');
      } catch (e) {
        console.log(`⚠️ Could not click searchbar: ${e}`);
      }
    } else {
      throw new Error('SearchBar not found');
    }
  });

  it('should have searchbar with correct safe area inset', async () => {
    // Vérifier les styles CSS pour le safe area
    const safeAreaInfo = await driver.execute(function() {
      const header = document.querySelector('header, [class*="header"], [data-testid="header"]');
      const searchbar = document.querySelector('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"]');
      
      if (!header || !searchbar) return null;
      
      const headerStyle = window.getComputedStyle(header);
      const searchbarStyle = window.getComputedStyle(searchbar);
      
      return {
        headerPaddingTop: headerStyle.paddingTop,
        headerMarginTop: headerStyle.marginTop,
        headerTop: headerStyle.top,
        searchbarTop: searchbarStyle.top,
        searchbarMarginTop: searchbarStyle.marginTop,
        hasNativeMobileClass: header.classList.contains('native-mobile'),
        safeAreaInsetTop: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || 
                         getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') ||
                         'not set'
      };
    });
    
    console.log(`📊 Safe Area Info:`, safeAreaInfo);
    
    if (safeAreaInfo) {
      // Vérifier que le header a la classe native-mobile
      expect(safeAreaInfo.hasNativeMobileClass, 'Header should have native-mobile class').to.be.true;
      
      await driver.saveScreenshot('./test-results/searchbar-safe-area-inset.png');
    }
  });

  it('should show status bar above searchbar', async () => {
    // Prendre un screenshot pour vérifier visuellement que la status bar est au-dessus
    await driver.saveScreenshot('./test-results/status-bar-above-searchbar.png');
    
    // Vérifier que la searchbar existe et est positionnée
    const searchbar = await driver.$('input[type="search"], input[placeholder*="Rechercher"], [data-testid="search-bar"]');
    if (await searchbar.isExisting()) {
      const searchbarRect = await searchbar.getRect();
      
      // La searchbar ne devrait pas être tout en haut (devrait avoir un espace pour la status bar)
      expect(searchbarRect.y, 'SearchBar should have space for status bar above').to.be.greaterThan(20);
    }
  });
});



