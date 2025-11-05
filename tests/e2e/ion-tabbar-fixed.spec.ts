import { expect } from 'chai';

describe('iOS Native - TabBar Fixed Position Tests', () => {
  let driver: WebdriverIO.Browser;

  before(async () => {
    driver = (global as any).driver;
  });

  it('should have ion-tab-bar fixed at bottom of screen', async () => {
    // Attendre que la page soit chargée
    await driver.waitUntil(async () => {
      const tabbar = await driver.$('ion-tab-bar');
      return await tabbar.isExisting();
    }, {
      timeout: 15000,
      timeoutMsg: 'ion-tab-bar not found'
    });

    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      // Obtenir la position et la taille du tabbar
      const tabbarRect = await tabbar.getRect();
      const windowSize = await driver.getWindowSize();
      
      console.log(`📊 TabBar position: top=${tabbarRect.y}, bottom=${tabbarRect.y + tabbarRect.height}, height=${tabbarRect.height}`);
      console.log(`📊 Window size: height=${windowSize.height}`);
      
      // Vérifier que le tabbar est en bas de l'écran
      // Le bottom du tabbar devrait être très proche du bottom de la fenêtre
      const tabbarBottom = tabbarRect.y + tabbarRect.height;
      const windowBottom = windowSize.height;
      const bottomDiff = Math.abs(windowBottom - tabbarBottom);
      
      console.log(`📊 TabBar bottom: ${tabbarBottom}, Window bottom: ${windowBottom}, Difference: ${bottomDiff}`);
      
      // Tolérance de 5px pour les variations
      expect(bottomDiff, 'ion-tab-bar should be at the bottom of the screen').to.be.at.most(5);
      
      // Prendre un screenshot
      await driver.saveScreenshot('./test-results/ion-tabbar-bottom-fixed.png');
    } else {
      throw new Error('ion-tab-bar not found');
    }
  });

  it('should keep ion-tab-bar fixed during scroll', async () => {
    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      // Obtenir la position initiale
      const initialRect = await tabbar.getRect();
      const initialBottom = initialRect.y + initialRect.height;
      
      console.log(`📊 Initial TabBar bottom position: ${initialBottom}`);
      
      // Faire défiler la page plusieurs fois
      const windowSize = await driver.getWindowSize();
      
      for (let i = 0; i < 3; i++) {
        await driver.touchAction([
          { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.7 },
          { action: 'wait', ms: 300 },
          { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.3 },
          { action: 'release' }
        ]);
        await driver.pause(500);
      }
      
      // Vérifier que le tabbar est toujours au même endroit
      const afterScrollRect = await tabbar.getRect();
      const afterScrollBottom = afterScrollRect.y + afterScrollRect.height;
      
      console.log(`📊 After scroll TabBar bottom position: ${afterScrollBottom}`);
      
      // Le tabbar devrait rester fixe (tolérance de 5px)
      const tolerance = 5;
      const positionDiff = Math.abs(afterScrollBottom - initialBottom);
      
      expect(positionDiff, 'ion-tab-bar should remain fixed during scroll').to.be.at.most(tolerance);
      
      await driver.saveScreenshot('./test-results/ion-tabbar-scroll-fixed.png');
    } else {
      throw new Error('ion-tab-bar not found');
    }
  });

  it('should have correct CSS position fixed for ion-tab-bar', async () => {
    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      // Vérifier les styles CSS calculés
      const position = await driver.execute(function() {
        const tabbar = document.querySelector('ion-tab-bar');
        if (!tabbar) return null;
        const computed = window.getComputedStyle(tabbar);
        return {
          position: computed.position,
          bottom: computed.bottom,
          left: computed.left,
          right: computed.right,
          zIndex: computed.zIndex
        };
      });
      
      console.log(`📊 TabBar computed styles:`, position);
      
      if (position) {
        // Sur iOS natif, le tabbar devrait avoir position: fixed ou sticky
        expect(position.position, 'TabBar should have fixed or sticky position').to.be.oneOf(['fixed', 'sticky', 'absolute']);
        
        // Le bottom devrait être défini
        expect(position.bottom, 'TabBar should have bottom property set').to.not.be.empty;
        
        await driver.saveScreenshot('./test-results/ion-tabbar-css-position.png');
      }
    }
  });

  it('should not move when scrolling to top', async () => {
    const tabbar = await driver.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      // Obtenir la position initiale
      const initialRect = await tabbar.getRect();
      const initialBottom = initialRect.y + initialRect.height;
      
      // Scroll vers le haut
      const windowSize = await driver.getWindowSize();
      await driver.touchAction([
        { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.3 },
        { action: 'wait', ms: 300 },
        { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.7 },
        { action: 'release' }
      ]);
      
      await driver.pause(1000);
      
      // Vérifier que le tabbar est toujours au même endroit
      const afterScrollRect = await tabbar.getRect();
      const afterScrollBottom = afterScrollRect.y + afterScrollRect.height;
      
      const tolerance = 5;
      const positionDiff = Math.abs(afterScrollBottom - initialBottom);
      
      expect(positionDiff, 'ion-tab-bar should remain fixed when scrolling to top').to.be.at.most(tolerance);
      
      await driver.saveScreenshot('./test-results/ion-tabbar-scroll-top-fixed.png');
    }
  });
});



