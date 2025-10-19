import { Platform } from 'react-native';

export const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
export const isNative = !isWeb;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Configuration des composants selon la plateforme
export const platformConfig = {
  // Composants vidéo
  videoPlayer: isWeb ? 'VideoPlayer' : 'VideoPlayerRN',
  
  // Hooks
  deviceType: isWeb ? 'useDeviceType' : 'useDeviceTypeRN',
  isMobile: isWeb ? 'useIsMobile' : 'useIsMobileRN',
  
  // Storage
  storage: isWeb ? 'localStorage' : 'AsyncStorage',
  
  // Navigation
  router: isWeb ? 'wouter' : 'expo-router',
  
  // Styles
  styling: isWeb ? 'tailwindcss' : 'nativewind',
};

// Dépendances problématiques pour React Native
export const problematicDependencies = [
  'hls.js', // Remplace par expo-av
  'mux.js', // Pas disponible sur RN
  'framer-motion', // Pas compatible RN
  'wouter', // Remplace par expo-router
  'react-dom', // Pas disponible sur RN
  'puppeteer', // Pas disponible sur RN
];

// Dépendances compatibles React Native
export const compatibleDependencies = [
  'expo-av', // Pour la lecture vidéo
  'expo-router', // Pour la navigation
  'react-native-reanimated', // Pour les animations
  'nativewind', // Pour le styling
  'react-native-svg', // Pour les icônes SVG
  '@react-native-async-storage/async-storage', // Pour le stockage
];
