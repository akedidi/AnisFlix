import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anisflix.app',
  appName: 'AnisFlix',
  webDir: 'dist/public',
  server: {
    // En développement iOS/Android, on pointe vers le serveur local Vite/Express
    // Pour la prod, commentez url et laissez Capacitor servir les assets buildés
    url: 'http://localhost:3000',
    androidScheme: 'http',
    iosScheme: 'http',
    allowNavigation: ['*'],
  },
  ios: {
    contentInset: 'never', // Changé de 'automatic' à 'never' pour éviter les décalages
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
      // launchUrl est obsolète dans les nouvelles versions de Capacitor
    },
    // Configuration pour le clavier
    Keyboard: {
      resize: 'none' as any, // Empêcher le redimensionnement automatique
      style: 'dark' as any,
      resizeOnFullScreen: false
    }
  }
};

export default config;
