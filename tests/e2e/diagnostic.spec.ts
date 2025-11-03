import { expect } from 'chai';
import { browser } from '@wdio/globals';

describe('iOS Native - Diagnostic Tests', () => {
  before(async function() {
    // Attendre que l'app soit chargée
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  it('should have app loaded', async function() {
    // Prendre un screenshot initial
    await browser.saveScreenshot('./test-results/01-app-loaded.png');
    
    // Vérifier que quelque chose est visible
    const pageSource = await browser.getPageSource();
    expect(pageSource.length, 'Page source should not be empty').to.be.greaterThan(0);
    
    console.log('✅ App loaded successfully');
  });

  it('should find ion-tab-bar element', async function() {
    // Attendre que la tabbar soit présente
    await browser.waitUntil(async () => {
      const tabbar = await browser.$('ion-tab-bar');
      return await tabbar.isExisting();
    }, {
      timeout: 15000,
      timeoutMsg: 'ion-tab-bar not found'
    });

    const tabbar = await browser.$('ion-tab-bar');
    const exists = await tabbar.isExisting();
    
    expect(exists, 'ion-tab-bar should exist').to.be.true;
    
    if (exists) {
      const rect = await tabbar.getRect();
      console.log(`📊 ion-tab-bar found:`, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        bottom: rect.y + rect.height
      });
      
      await browser.saveScreenshot('./test-results/02-ion-tabbar-found.png');
    }
  });

  it('should find searchbar element', async function() {
    // Chercher la searchbar avec plusieurs sélecteurs
    const selectors = [
      '[data-testid="search-bar"]',
      'input[type="search"]',
      'input[placeholder*="Rechercher"]',
      'input[placeholder*="Search"]'
    ];

    let searchbar = null;
    let foundSelector = null;

    for (const selector of selectors) {
      searchbar = await browser.$(selector);
      if (await searchbar.isExisting()) {
        foundSelector = selector;
        break;
      }
    }

    if (foundSelector) {
      console.log(`✅ SearchBar found with selector: ${foundSelector}`);
      
      const rect = await searchbar.getRect();
      console.log(`📊 SearchBar position:`, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.y
      });
      
      await browser.saveScreenshot('./test-results/03-searchbar-found.png');
    } else {
      console.log('⚠️ SearchBar not found with any selector');
      await browser.saveScreenshot('./test-results/03-searchbar-not-found.png');
      
      // Prendre le page source pour debug
      const pageSource = await browser.getPageSource();
      console.log('Page source length:', pageSource.length);
    }
  });

  it('should check ion-tab-bar position', async function() {
    const tabbar = await browser.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      const tabbarRect = await tabbar.getRect();
      const windowSize = await browser.getWindowSize();
      
      console.log(`📊 Window size:`, windowSize);
      console.log(`📊 TabBar position:`, tabbarRect);
      
      const tabbarBottom = tabbarRect.y + tabbarRect.height;
      const windowBottom = windowSize.height;
      const bottomDiff = Math.abs(windowBottom - tabbarBottom);
      
      console.log(`📊 TabBar bottom: ${tabbarBottom}, Window bottom: ${windowBottom}, Difference: ${bottomDiff}`);
      
      // Vérifier les styles CSS
      const styles = await browser.execute(function() {
        const tabbar = document.querySelector('ion-tab-bar');
        if (!tabbar) return null;
        const computed = window.getComputedStyle(tabbar);
        return {
          position: computed.position,
          bottom: computed.bottom,
          left: computed.left,
          right: computed.right,
          zIndex: computed.zIndex,
          transform: computed.transform
        };
      });
      
      console.log(`📊 TabBar computed styles:`, styles);
      
      await browser.saveScreenshot('./test-results/04-tabbar-position.png');
    }
  });

  it('should check header and searchbar position', async function() {
    // Chercher le header
    const headerSelectors = [
      'header',
      '[class*="header"]',
      '[data-testid="header"]'
    ];

    let header = null;
    for (const selector of headerSelectors) {
      header = await browser.$(selector);
      if (await header.isExisting()) {
        break;
      }
    }

    if (await header.isExisting()) {
      const headerRect = await header.getRect();
      console.log(`📊 Header position:`, {
        x: headerRect.x,
        y: headerRect.y,
        width: headerRect.width,
        height: headerRect.height,
        top: headerRect.y
      });
      
      // Vérifier les styles CSS
      const headerStyles = await browser.execute(function() {
        const header = document.querySelector('header, [class*="header"], [data-testid="header"]');
        if (!header) return null;
        const computed = window.getComputedStyle(header);
        return {
          position: computed.position,
          top: computed.top,
          paddingTop: computed.paddingTop,
          marginTop: computed.marginTop,
          hasNativeMobileClass: header.classList.contains('native-mobile')
        };
      });
      
      console.log(`📊 Header computed styles:`, headerStyles);
      
      await browser.saveScreenshot('./test-results/05-header-position.png');
    } else {
      console.log('⚠️ Header not found');
      await browser.saveScreenshot('./test-results/05-header-not-found.png');
    }
  });

  it('should scroll and check tabbar stays fixed', async function() {
    const tabbar = await browser.$('ion-tab-bar');
    
    if (await tabbar.isExisting()) {
      const initialRect = await tabbar.getRect();
      const initialBottom = initialRect.y + initialRect.height;
      
      console.log(`📊 Initial TabBar bottom: ${initialBottom}`);
      
      // Faire défiler vers le bas
      const windowSize = await browser.getWindowSize();
      await browser.touchAction([
        { action: 'press', x: windowSize.width / 2, y: windowSize.height * 0.7 },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: windowSize.width / 2, y: windowSize.height * 0.3 },
        { action: 'release' }
      ]);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterScrollRect = await tabbar.getRect();
      const afterScrollBottom = afterScrollRect.y + afterScrollRect.height;
      
      console.log(`📊 After scroll TabBar bottom: ${afterScrollBottom}`);
      
      const positionDiff = Math.abs(afterScrollBottom - initialBottom);
      console.log(`📊 Position difference: ${positionDiff}px`);
      
      await browser.saveScreenshot('./test-results/06-tabbar-after-scroll.png');
      
      // Accepter jusqu'à 10px de différence (tolérance)
      if (positionDiff > 10) {
        console.log(`⚠️ TabBar moved ${positionDiff}px during scroll`);
      } else {
        console.log(`✅ TabBar stayed fixed (difference: ${positionDiff}px)`);
      }
    }
  });

  it('should get full page source for debugging', async function() {
    const pageSource = await browser.getPageSource();
    
    // Écrire le page source dans un fichier pour debug
    const fs = require('fs');
    fs.writeFileSync('./test-results/page-source.xml', pageSource);
    
    console.log(`📊 Page source saved to test-results/page-source.xml`);
    console.log(`📊 Page source length: ${pageSource.length} characters`);
    
    // Chercher les éléments clés dans le page source
    const hasTabBar = pageSource.includes('ion-tab-bar');
    const hasSearchBar = pageSource.includes('search-bar') || (pageSource.includes('input') && pageSource.includes('search'));
    const hasHeader = pageSource.includes('header') || pageSource.includes('native-mobile');
    
    console.log(`📊 Elements in page source:`, {
      hasTabBar,
      hasSearchBar,
      hasHeader
    });
  });
});
