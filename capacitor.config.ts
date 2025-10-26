import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anisflix.app',
  appName: 'AnisFlix',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['*'],
    // Configuration pour le développement local
    url: 'http://localhost:3000',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#000000',
    allowsLinkPreview: false,
    handleApplicationNotifications: true,
    preferredContentMode: 'mobile',
    // Configuration pour les liens profonds
    overrideUserAgent: 'AnisFlix Mobile App'
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Configuration pour les permissions Android
    appendUserAgent: 'AnisFlix',
    // Configuration pour les liens profonds
    overrideUserAgent: 'AnisFlix Mobile App'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#E50914",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000'
    },
    // Configuration pour l'app
    App: {
      launchUrl: "https://anisflix.vercel.app"
    },
    // Configuration pour le clavier
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  }
};

export default config;
