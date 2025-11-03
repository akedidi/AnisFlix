import type { Options } from '@wdio/types';

export const config: Options.Testrunner = {
  runner: 'local',
  path: '/',
  
  specs: [
    './tests/e2e/**/*.spec.ts'
  ],
  
  // Tests iOS spécifiques uniquement
  exclude: [],

  maxInstances: 1,

  capabilities: [
    {
      platformName: 'iOS',
      'appium:deviceName': 'iPhone 15 Pro',
      'appium:platformVersion': '17.5', // Utiliser une version disponible (17.5, 18.0, 18.3, 18.6)
      'appium:automationName': 'XCUITest',
      'appium:app': process.env.IOS_APP_PATH || '/Users/aniskedidi/Library/Developer/Xcode/DerivedData/App-fkitacxnnkuqidcvamxehrsgenmm/Build/Products/Debug-iphonesimulator/App.app',
      'appium:bundleId': 'com.anisflix.app',
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 300,
      'appium:waitForIdleTimeout': 1000,
      'appium:shouldUseTestManagerForVisibilityDetection': false,
      'appium:shouldUseSingletonTestManager': false,
      'appium:usePrebuiltWDA': false,
      'appium:wdaLaunchTimeout': 120000,
      'appium:wdaStartupRetries': 2,
      'appium:iosInstallPause': 8000,
      'appium:autoAcceptAlerts': true,
      'appium:autoDismissAlerts': false,
      'appium:maxTypingFrequency': 60,
      'appium:shouldUseTestManagerForVisibilityDetection': false,
      'appium:shouldTerminateApp': true,
      'appium:enforceFreshSimulator': false,
      'appium:simulatorStartupTimeout': 120000,
      'appium:usePrebuiltWDA': false,
      'appium:wdaLaunchTimeout': 120000,
      'appium:wdaStartupRetries': 2,
      'appium:iosInstallPause': 8000,
      'appium:autoAcceptAlerts': true,
      'appium:autoDismissAlerts': false,
      'appium:maxTypingFrequency': 60,
    },
    // Android configuration (optionnel)
    // {
    //   platformName: 'Android',
    //   'appium:deviceName': 'Pixel_7_Pro',
    //   'appium:platformVersion': '13.0',
    //   'appium:automationName': 'UiAutomator2',
    //   'appium:app': process.env.ANDROID_APP_PATH || './android/app/build/outputs/apk/debug/app-debug.apk',
    //   'appium:appPackage': 'com.anisflix.app',
    //   'appium:appActivity': '.MainActivity',
    //   'appium:noReset': false,
    //   'appium:fullReset': false,
    //   'appium:newCommandTimeout': 300,
    //   'appium:autoGrantPermissions': true,
    // }
  ],

  logLevel: 'info',

  bail: 0,

  baseUrl: 'http://localhost',

  waitforTimeout: 10000,

  connectionRetryTimeout: 120000,

  connectionRetryCount: 3,

  services: [
    ['appium', {
      args: {
        relaxedSecurity: true,
        port: 4723,
        log: './logs/appium.log',
      },
      logPath: './logs'
    }]
  ],

  framework: 'mocha',

  reporters: [
    'spec',
    [
      '@wdio/json-reporter',
      {
        outputDir: './test-results',
        outputFileFormat: function (options: any) {
          return `results-${options.cid}.json`;
        }
      }
    ]
  ],

  mochaOpts: {
    ui: 'bdd',
    timeout: 600000, // 10 minutes pour les tests complets
    retries: 1,
  },

  before: function (capabilities, specs) {
    // Exposer browser globalement pour les tests
    (global as any).browser = this;
    (global as any).driver = this; // Pour compatibilité
    // S'assurer que browser est disponible
    if (!(global as any).browser) {
      throw new Error('Browser not initialized');
    }
  },

  beforeTest: function (test, context) {
    console.log(`\n🧪 Starting test: ${test.title}`);
  },

  afterTest: function (test, context, { error, result, duration, passed, retries }) {
    if (error) {
      console.error(`❌ Test failed: ${test.title}`);
      console.error(`   Error: ${error.message}`);
      
      // Prendre un screenshot en cas d'erreur
      try {
        const screenshot = (global as any).driver.takeScreenshot();
        const fs = require('fs');
        const path = require('path');
        const screenshotPath = path.join(process.cwd(), 'test-results', `screenshot-${Date.now()}.png`);
        fs.writeFileSync(screenshotPath, screenshot, 'base64');
        console.log(`   Screenshot saved: ${screenshotPath}`);
      } catch (e) {
        console.error(`   Failed to save screenshot: ${e}`);
      }
    } else {
      console.log(`✅ Test passed: ${test.title} (${duration}ms)`);
    }
  },

  afterSuite: function (suite) {
    console.log(`\n📊 Suite completed: ${suite.title}`);
  },

  onComplete: function (exitCode, config, capabilities, results) {
    console.log('\n🎯 Test run completed!');
    console.log(`Exit code: ${exitCode}`);
  }
};

