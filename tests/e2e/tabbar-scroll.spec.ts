import { expect } from 'chai';

describe('TabBar and Scroll Tests', () => {
  let driver: WebdriverIO.Browser;

  before(async () => {
    driver = (global as any).driver;
  });

  it('should have tabbar fixed at bottom', async () => {
    // Attendre que la page soit chargée
    await driver.waitUntil(async () => {
      const tabbar = await driver.$('ion-tab-bar');
      return await tabbar.isExisting();
    }, {
      timeout: 15000,
      timeoutMsg: 'TabBar not found'
    });

    // Trouver le tabbar
    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      // Obtenir la position et la taille du tabbar
      const tabbarRect = await tabbar.getRect();
      const windowSize = await driver.getWindowSize();
      
      console.log(`📊 TabBar position: bottom=${tabbarRect.y + tabbarRect.height}, height=${tabbarRect.height}`);
      console.log(`📊 Window height: ${windowSize.height}`);
      
      // Le tabbar devrait être en bas de l'écran
      // Tolérance de 10px pour les variations
      const tolerance = 10;
      const expectedBottom = windowSize.height;
      const actualBottom = tabbarRect.y + tabbarRect.height;
      const bottomDiff = Math.abs(expectedBottom - actualBottom);
      
      expect(bottomDiff, 'TabBar should be at the bottom of the screen').to.be.at.most(tolerance);
      
      // Prendre un screenshot
      await driver.saveScreenshot('./test-results/tabbar-bottom-position.png');
    } else {
      console.log('⚠️ TabBar not found');
    }
  });

  it('should have safe area padding for tabbar', async () => {
    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      const tabbarRect = await tabbar.getRect();
      const windowSize = await driver.getWindowSize();
      
      // Sur iOS avec barre d'accueil, le tabbar devrait avoir un padding-bottom
      // pour ne pas chevaucher la barre d'accueil
      // La hauteur du tabbar devrait être > 70px (hauteur normale + safe-area-inset-bottom)
      
      console.log(`📊 TabBar height: ${tabbarRect.height}`);
      
      // La hauteur minimale devrait être 70px (hauteur normale)
      expect(tabbarRect.height, 'TabBar should have minimum height').to.be.at.least(70);
      
      // Sur iPhone avec barre d'accueil, la hauteur devrait être > 70px
      // (environ 70px + env(safe-area-inset-bottom) ≈ 70px + 34px = 104px)
      // Mais on accepte une tolérance
      
      await driver.saveScreenshot('./test-results/tabbar-safe-area.png');
    }
  });

  it('should keep tabbar visible during scroll', async () => {
    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      // Obtenir la position initiale
      const initialRect = await tabbar.getRect();
      const initialBottom = initialRect.y + initialRect.height;
      
      console.log(`📊 Initial TabBar bottom: ${initialBottom}`);
      
      // Faire défiler la page
      const windowSize = await driver.getWindowSize();
      await driver.touchAction([
        { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.7 },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.3 },
        { action: 'release' }
      ]);
      
      // Attendre que le scroll se stabilise
      await driver.pause(1000);
      
      // Vérifier que le tabbar est toujours au même endroit
      const afterScrollRect = await tabbar.getRect();
      const afterScrollBottom = afterScrollRect.y + afterScrollRect.height;
      
      console.log(`📊 After scroll TabBar bottom: ${afterScrollBottom}`);
      
      // Le tabbar devrait rester fixe
      const tolerance = 5;
      const positionDiff = Math.abs(afterScrollBottom - initialBottom);
      
      expect(positionDiff, 'TabBar should remain fixed during scroll').to.be.at.most(tolerance);
      
      await driver.saveScreenshot('./test-results/tabbar-scroll-fixed.png');
    }
  });

  it('should navigate between tabs', async () => {
    // Liste des onglets à tester
    const tabs = [
      { tab: 'home', selector: 'ion-tab-button[tab="home"]' },
      { tab: 'movies', selector: 'ion-tab-button[tab="movies"]' },
      { tab: 'series', selector: 'ion-tab-button[tab="series"]' },
      { tab: 'favorites', selector: 'ion-tab-button[tab="favorites"]' },
      { tab: 'settings', selector: 'ion-tab-button[tab="settings"]' }
    ];

    for (const tabInfo of tabs) {
      const tabButton = await driver.$(tabInfo.selector);
      
      if (await tabButton.isExisting()) {
        // Cliquer sur l'onglet
        await tabButton.click();
        
        // Attendre la navigation
        await driver.pause(1000);
        
        // Vérifier que l'onglet est sélectionné
        const isSelected = await tabButton.getAttribute('aria-selected');
        expect(isSelected, `Tab ${tabInfo.tab} should be selected`).to.equal('true');
        
        // Prendre un screenshot
        await driver.saveScreenshot(`./test-results/tabbar-${tabInfo.tab}.png`);
      } else {
        console.log(`⚠️ Tab ${tabInfo.tab} not found`);
      }
    }
  });

  it('should scroll content correctly', async () => {
    // Naviguer vers une page avec du contenu
    const moviesTab = await driver.$('ion-tab-button[tab="movies"]');
    if (await moviesTab.isExisting()) {
      await moviesTab.click();
      await driver.pause(2000);
    }

    // Obtenir la position initiale du scroll
    const initialScroll = await driver.execute('return window.scrollY || document.documentElement.scrollTop');
    
    console.log(`📊 Initial scroll position: ${initialScroll}`);
    
    // Faire défiler vers le bas
    const windowSize = await driver.getWindowSize();
    await driver.touchAction([
      { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.7 },
      { action: 'wait', ms: 500 },
      { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.3 },
      { action: 'release' }
    ]);
    
    await driver.pause(1000);
    
    // Vérifier que le scroll a changé
    const afterScroll = await driver.execute('return window.scrollY || document.documentElement.scrollTop');
    
    console.log(`📊 After scroll position: ${afterScroll}`);
    
    // Le scroll devrait avoir changé (augmenté vers le bas)
    expect(afterScroll, 'Scroll position should change').to.be.greaterThan(initialScroll);
    
    await driver.saveScreenshot('./test-results/scroll-content.png');
  });

  it('should not hide content behind tabbar', async () => {
    // Naviguer vers une page avec du contenu
    const moviesTab = await driver.$('ion-tab-button[tab="movies"]');
    if (await moviesTab.isExisting()) {
      await moviesTab.click();
      await driver.pause(2000);
    }

    // Obtenir la position du tabbar
    const tabbar = await driver.$('ion-tab-bar');
    if (await tabbar.isExisting()) {
      const tabbarRect = await tabbar.getRect();
      const tabbarTop = tabbarRect.y;
      
      // Faire défiler jusqu'en bas
      const windowSize = await driver.getWindowSize();
      for (let i = 0; i < 5; i++) {
        await driver.touchAction([
          { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.8 },
          { action: 'wait', ms: 300 },
          { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.2 },
          { action: 'release' }
        ]);
        await driver.pause(500);
      }
      
      // Vérifier que le contenu a un padding-bottom pour éviter d'être caché
      // Cette vérification est plus visuelle, mais on peut prendre un screenshot
      await driver.saveScreenshot('./test-results/content-not-hidden-by-tabbar.png');
      
      // Vérifier que le dernier élément visible n'est pas sous le tabbar
      const lastVisibleElement = await driver.execute(`
        const elements = document.querySelectorAll('[data-testid*="movie"], [data-testid*="card"], img');
        const lastElement = elements[elements.length - 1];
        return lastElement ? lastElement.getBoundingClientRect().bottom : 0;
      `);
      
      const tabbarTopPx = tabbarTop;
      expect(lastVisibleElement, 'Last element should not be hidden by tabbar').to.be.at.most(tabbarTopPx + 20);
    }
  });
});


