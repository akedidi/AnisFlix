import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anisflix.app',
  appName: 'AnisFlix',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['*'],
    // Configuration pour la production - pointer vers Vercel
    // Pour le développement local, commenter cette ligne et laisser apiClient gérer
    // url: 'https://anisflix.vercel.app',
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
      // La configuration est gérée automatiquement par Capacitor
    }
  }
};

export default config;
