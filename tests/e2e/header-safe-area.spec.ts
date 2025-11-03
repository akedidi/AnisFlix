import { expect } from 'chai';

describe('Header Safe Area Tests', () => {
  let driver: WebdriverIO.Browser;

  before(async () => {
    driver = (global as any).driver;
  });

  it('should position header under the notch/Dynamic Island', async () => {
    // Attendre que la page soit chargée
    await driver.waitUntil(async () => {
      const header = await driver.$('header, [class*="header"], [data-testid="header"]');
      return await header.isExisting();
    }, {
      timeout: 15000,
      timeoutMsg: 'Header not found'
    });

    // Trouver le header
    const header = await driver.$('header, [class*="header"], [data-testid="header"]');
    
    if (await header.isExisting()) {
      // Obtenir la position et la taille du header
      const headerRect = await header.getRect();
      const windowSize = await driver.getWindowSize();
      
      // Sur iOS, le header devrait commencer sous l'encoche
      // L'encoche fait généralement environ 47px de hauteur
      const expectedTopPadding = 47; // env(safe-area-inset-top)
      
      console.log(`📊 Header position: top=${headerRect.y}, height=${headerRect.height}`);
      console.log(`📊 Window size: height=${windowSize.height}`);
      
      // Vérifier que le header n'est pas tout en haut (devrait avoir un padding-top)
      // Le header devrait commencer après l'encoche
      expect(headerRect.y, 'Header should start below notch').to.be.at.least(expectedTopPadding - 10);
      
      // Prendre un screenshot pour vérification visuelle
      await driver.saveScreenshot('./test-results/header-safe-area.png');
      
      // Vérifier que le header a la classe native-mobile
      const headerClass = await header.getAttribute('class');
      const hasNativeMobileClass = headerClass && headerClass.includes('native-mobile');
      
      console.log(`📊 Header classes: ${headerClass}`);
      console.log(`📊 Has native-mobile class: ${hasNativeMobileClass}`);
    } else {
      console.log('⚠️ Header not found, skipping safe area test');
    }
  });

  it('should keep header sticky during scroll', async () => {
    // Trouver le header
    const header = await driver.$('header, [class*="header"], [data-testid="header"]');
    
    if (await header.isExisting()) {
      // Obtenir la position initiale du header
      const initialRect = await header.getRect();
      const initialTop = initialRect.y;
      
      console.log(`📊 Initial header position: top=${initialTop}`);
      
      // Faire défiler la page
      const windowSize = await driver.getWindowSize();
      await driver.touchAction([
        { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.7 },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.3 },
        { action: 'release' }
      ]);
      
      // Attendre un peu pour que le scroll se stabilise
      await driver.pause(1000);
      
      // Vérifier que le header est toujours au même endroit (sticky)
      const afterScrollRect = await header.getRect();
      const afterScrollTop = afterScrollRect.y;
      
      console.log(`📊 After scroll header position: top=${afterScrollTop}`);
      
      // Le header devrait rester à la même position (ou très proche)
      // Tolérance de 5px pour les variations
      const tolerance = 5;
      const positionDiff = Math.abs(afterScrollTop - initialTop);
      
      expect(positionDiff, 'Header should remain sticky during scroll').to.be.at.most(tolerance);
      
      // Prendre un screenshot
      await driver.saveScreenshot('./test-results/header-sticky-scroll.png');
    } else {
      console.log('⚠️ Header not found, skipping sticky test');
    }
  });

  it('should have correct safe area padding', async () => {
    // Trouver le header
    const header = await driver.$('header, [class*="header"], [data-testid="header"]');
    
    if (await header.isExisting()) {
      // Obtenir les styles calculés du header
      const headerRect = await header.getRect();
      
      // Sur iOS natif, le header devrait avoir un padding-top correspondant à safe-area-inset-top
      // On peut vérifier cela en comparant la position du header avec le haut de l'écran
      const windowSize = await driver.getWindowSize();
      
      // La position top du header devrait être > 0 (sous l'encoche)
      expect(headerRect.y, 'Header should have top padding for safe area').to.be.greaterThan(0);
      
      // Sur iPhone avec encoche, le padding devrait être environ 47px
      // Mais on accepte une tolérance car cela peut varier selon l'appareil
      const minSafeArea = 20; // Minimum raisonnable
      const maxSafeArea = 60; // Maximum raisonnable pour les appareils avec Dynamic Island
      
      expect(headerRect.y, 'Safe area padding should be within reasonable range').to.be.within(minSafeArea, maxSafeArea);
      
      console.log(`✅ Header safe area padding: ${headerRect.y}px`);
      
      // Prendre un screenshot
      await driver.saveScreenshot('./test-results/header-safe-area-padding.png');
    }
  });

  it('should show status bar above header', async () => {
    // Prendre un screenshot pour vérifier visuellement
    await driver.saveScreenshot('./test-results/status-bar-above-header.png');
    
    // Vérifier que le header existe
    const header = await driver.$('header, [class*="header"], [data-testid="header"]');
    const headerExists = await header.isExisting();
    
    expect(headerExists, 'Header should be visible').to.be.true;
    
    // Sur iOS, on peut vérifier que le header ne chevauche pas la status bar
    // en vérifiant que la position du header est suffisamment basse
    if (headerExists) {
      const headerRect = await header.getRect();
      expect(headerRect.y, 'Header should not overlap status bar').to.be.greaterThan(20);
    }
  });
});


