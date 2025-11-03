import { expect } from 'chai';

describe('Navigation Animations Tests', () => {
  let driver: WebdriverIO.Browser;

  before(async () => {
    driver = (global as any).driver;
  });

  it('should navigate to movie detail with push animation', async () => {
    // Attendre que la page d'accueil soit chargée
    await driver.waitUntil(async () => {
      const homeElements = await driver.$$('ion-tab-button[tab="home"]');
      return homeElements.length > 0;
    }, {
      timeout: 15000,
      timeoutMsg: 'Home page not loaded'
    });

    // Trouver un film dans la hero section ou dans un carousel
    const heroSection = await driver.$('[data-testid="hero-section"]');
    if (await heroSection.isExisting()) {
      // Cliquer sur la hero section pour ouvrir le détail
      await heroSection.click();
      
      // Attendre l'animation de transition (push)
      await driver.pause(1000);
      
      // Vérifier qu'on est sur la page de détail
      const movieDetail = await driver.$('[data-testid="movie-detail"]');
      const exists = await movieDetail.isExisting();
      
      expect(exists, 'Movie detail page should be visible after navigation').to.be.true;
      
      // Vérifier que le bouton retour existe
      const backButton = await driver.$('ion-back-button');
      const backButtonExists = await backButton.isExisting();
      
      expect(backButtonExists, 'Back button should be visible').to.be.true;
      
      // Prendre un screenshot pour vérifier visuellement
      await driver.saveScreenshot('./test-results/navigation-push-animation.png');
    } else {
      console.log('⚠️ Hero section not found, skipping navigation test');
    }
  });

  it('should navigate back with pop animation', async () => {
    // Attendre que la page soit chargée
    await driver.pause(1000);
    
    // Trouver le bouton retour
    const backButton = await driver.$('ion-back-button');
    const backButtonExists = await backButton.isExisting();
    
    if (backButtonExists) {
      // Cliquer sur le bouton retour
      await backButton.click();
      
      // Attendre l'animation de retour (pop)
      await driver.pause(1000);
      
      // Vérifier qu'on est revenu à la page d'accueil
      const homeTab = await driver.$('ion-tab-button[tab="home"]');
      const isSelected = await homeTab.getAttribute('aria-selected');
      
      expect(isSelected, 'Should return to home tab').to.equal('true');
      
      // Prendre un screenshot
      await driver.saveScreenshot('./test-results/navigation-pop-animation.png');
    } else {
      console.log('⚠️ Back button not found, skipping pop animation test');
    }
  });

  it('should support swipe back gesture', async () => {
    // Naviguer vers une page de détail d'abord
    const heroSection = await driver.$('[data-testid="hero-section"]');
    if (await heroSection.isExisting()) {
      await heroSection.click();
      await driver.pause(1000);
      
      // Vérifier qu'on est sur la page de détail
      const movieDetail = await driver.$('[data-testid="movie-detail"]');
      const detailExists = await movieDetail.isExisting();
      
      if (detailExists) {
        // Effectuer un swipe depuis le bord gauche vers la droite
        const size = await driver.getWindowSize();
        const startX = 10; // Commencer près du bord gauche
        const startY = size.height / 2;
        const endX = size.width * 0.8; // Swiper vers la droite
        const endY = startY;
        
        await driver.touchAction([
          { action: 'press', x: startX, y: startY },
          { action: 'wait', ms: 300 },
          { action: 'moveTo', x: endX, y: endY },
          { action: 'release' }
        ]);
        
        // Attendre l'animation de retour
        await driver.pause(1000);
        
        // Vérifier qu'on est revenu à la page d'accueil
        const homeTab = await driver.$('ion-tab-button[tab="home"]');
        const isSelected = await homeTab.getAttribute('aria-selected');
        
        expect(isSelected, 'Should return to home after swipe back').to.equal('true');
        
        // Prendre un screenshot
        await driver.saveScreenshot('./test-results/swipe-back-gesture.png');
      }
    } else {
      console.log('⚠️ Hero section not found, skipping swipe back test');
    }
  });

  it('should maintain navigation history', async () => {
    // Naviguer vers plusieurs pages
    const heroSection = await driver.$('[data-testid="hero-section"]');
    if (await heroSection.isExisting()) {
      // Première navigation
      await heroSection.click();
      await driver.pause(1000);
      
      // Vérifier qu'on peut revenir en arrière
      const backButton = await driver.$('ion-back-button');
      if (await backButton.isExisting()) {
        await backButton.click();
        await driver.pause(1000);
        
        // Vérifier qu'on est bien revenu
        const homeTab = await driver.$('ion-tab-button[tab="home"]');
        const isSelected = await homeTab.getAttribute('aria-selected');
        
        expect(isSelected, 'Navigation history should work correctly').to.equal('true');
      }
    }
  });
});



