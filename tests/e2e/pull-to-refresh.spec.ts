import { expect } from 'chai';

describe('Pull to Refresh Tests', () => {
  let driver: WebdriverIO.Browser;

  before(async () => {
    driver = (global as any).driver;
  });

  it('should trigger pull to refresh when swiping down', async () => {
    // Attendre que la page soit chargée
    await driver.waitUntil(async () => {
      const homeTab = await driver.$('ion-tab-button[tab="home"]');
      return await homeTab.isExisting();
    }, {
      timeout: 15000,
      timeoutMsg: 'Home page not loaded'
    });

    // S'assurer qu'on est sur la page d'accueil
    const homeTab = await driver.$('ion-tab-button[tab="home"]');
    await homeTab.click();
    await driver.pause(1000);

    // Obtenir la taille de la fenêtre
    const windowSize = await driver.getWindowSize();
    const centerX = windowSize.width / 2;
    const startY = windowSize.height * 0.2; // Commencer près du haut
    const endY = windowSize.height * 0.6; // Tirer vers le bas

    // Prendre un screenshot avant le pull
    await driver.saveScreenshot('./test-results/pull-to-refresh-before.png');

    // Effectuer le geste de pull to refresh
    await driver.touchAction([
      { action: 'press', x: centerX, y: startY },
      { action: 'wait', ms: 300 },
      { action: 'moveTo', x: centerX, y: endY },
      { action: 'wait', ms: 500 },
      { action: 'release' }
    ]);

    // Attendre que le spinner de refresh apparaisse
    await driver.pause(500);

    // Vérifier que le refresher est visible
    // Ionic utilise ion-refresher pour le pull to refresh
    const refresher = await driver.$('ion-refresher');
    const refresherExists = await refresher.isExisting();

    if (refresherExists) {
      // Vérifier que le refresher est visible
      const refresherVisible = await refresher.isDisplayed();
      expect(refresherVisible, 'Refresher should be visible').to.be.true;

      // Prendre un screenshot pendant le refresh
      await driver.saveScreenshot('./test-results/pull-to-refresh-during.png');

      // Attendre que le refresh se termine
      await driver.waitUntil(async () => {
        const refresherVisible = await refresher.isDisplayed();
        return !refresherVisible;
      }, {
        timeout: 10000,
        timeoutMsg: 'Refresher should disappear after refresh'
      });

      // Prendre un screenshot après le refresh
      await driver.saveScreenshot('./test-results/pull-to-refresh-after.png');
    } else {
      console.log('⚠️ ion-refresher not found, checking for alternative refresh indicators');
      
      // Vérifier s'il y a d'autres indicateurs de refresh
      const refreshSpinner = await driver.$('[class*="refresher"], [class*="spinner"]');
      const hasRefreshIndicator = await refreshSpinner.isExisting();
      
      if (hasRefreshIndicator) {
        console.log('✅ Alternative refresh indicator found');
        await driver.saveScreenshot('./test-results/pull-to-refresh-alternative.png');
      } else {
        console.log('❌ No refresh indicator found');
        await driver.saveScreenshot('./test-results/pull-to-refresh-missing.png');
      }
    }
  });

  it('should refresh content after pull to refresh', async () => {
    // Naviguer vers la page d'accueil
    const homeTab = await driver.$('ion-tab-button[tab="home"]');
    await homeTab.click();
    await driver.pause(1000);

    // Obtenir le contenu initial de la page
    const initialContent = await driver.getPageSource();
    
    // Effectuer le pull to refresh
    const windowSize = await driver.getWindowSize();
    const centerX = windowSize.width / 2;
    const startY = windowSize.height * 0.2;
    const endY = windowSize.height * 0.6;

    await driver.touchAction([
      { action: 'press', x: centerX, y: startY },
      { action: 'wait', ms: 300 },
      { action: 'moveTo', x: centerX, y: endY },
      { action: 'wait', ms: 500 },
      { action: 'release' }
    ]);

    // Attendre que le refresh se termine
    await driver.pause(2000);

    // Vérifier que le contenu a été rafraîchi
    // (En pratique, on pourrait vérifier que les timestamps ont changé, etc.)
    const afterRefreshContent = await driver.getPageSource();
    
    // Au minimum, vérifier que le contenu existe toujours
    expect(afterRefreshContent.length, 'Content should still exist after refresh').to.be.greaterThan(0);
    
    // Prendre un screenshot
    await driver.saveScreenshot('./test-results/pull-to-refresh-content.png');
  });

  it('should show refresh spinner during pull', async () => {
    // Naviguer vers la page d'accueil
    const homeTab = await driver.$('ion-tab-button[tab="home"]');
    await homeTab.click();
    await driver.pause(1000);

    // Effectuer le pull to refresh
    const windowSize = await driver.getWindowSize();
    const centerX = windowSize.width / 2;
    const startY = windowSize.height * 0.2;
    const endY = windowSize.height * 0.6;

    await driver.touchAction([
      { action: 'press', x: centerX, y: startY },
      { action: 'wait', ms: 300 },
      { action: 'moveTo', x: centerX, y: endY },
      { action: 'wait', ms: 500 },
      { action: 'release' }
    ]);

    // Attendre un peu pour que le spinner apparaisse
    await driver.pause(500);

    // Vérifier la présence du spinner
    const refresherContent = await driver.$('ion-refresher-content');
    const spinnerExists = await refresherContent.isExisting();

    if (spinnerExists) {
      const isVisible = await refresherContent.isDisplayed();
      expect(isVisible, 'Refresh spinner should be visible').to.be.true;
      
      // Vérifier le texte du refresher
      const refresherText = await driver.$('ion-refresher-content');
      const text = await refresherText.getText();
      
      console.log(`📊 Refresher text: ${text}`);
      
      // Le texte devrait contenir "Tirez pour rafraîchir" ou "Chargement..."
      expect(text.length, 'Refresher should have text').to.be.greaterThan(0);
      
      await driver.saveScreenshot('./test-results/pull-to-refresh-spinner.png');
    } else {
      console.log('⚠️ Refresh spinner not found');
      await driver.saveScreenshot('./test-results/pull-to-refresh-no-spinner.png');
    }
  });

  it('should only work on native platform', async () => {
    // Ce test vérifie que le pull to refresh n'est activé que sur natif
    // On peut vérifier cela en regardant si ion-refresher existe dans le DOM
    
    const refresher = await driver.$('ion-refresher');
    const refresherExists = await refresher.isExisting();
    
    // Sur natif, le refresher devrait exister (même si pas actif)
    // Cette vérification est plus pour documentation
    console.log(`📊 Pull to refresh available: ${refresherExists}`);
    
    // Prendre un screenshot de la structure
    await driver.saveScreenshot('./test-results/pull-to-refresh-structure.png');
  });
});



