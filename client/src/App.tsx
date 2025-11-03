import { lazy, Suspense, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useServiceWorker } from "@/hooks/useOffline";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import CustomSplashScreen from "@/components/CustomSplashScreen";
import ErrorBoundary from "@/components/ErrorBoundary";

// Import des styles pour le clavier natif et tabbar
import "@/styles/native-keyboard.css";
import "@/styles/tabbar.css";

// Lazy load des composants App selon la plateforme
const AppWeb = lazy(() => import("@/AppWeb"));
const AppNative = lazy(() => import("@/AppNative"));

/**
 * Détecte si on est dans une app Capacitor native (iOS/Android)
 */
const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    // Préférence: API officielle Capacitor
    const capIsNative = Capacitor?.isNativePlatform?.() ?? false;
    if (capIsNative) return true;

    const hasCapacitor = (window as any).Capacitor !== undefined;
    const platform = (window as any).Capacitor?.getPlatform?.();
    const ua = navigator.userAgent.toLowerCase();
    const heuristic = ua.includes('capacitor') || ua.includes('cordova') || ua.includes('wv');

    const isNative = (platform === 'ios' || platform === 'android') || heuristic;

    console.log('[App] Platform detection:', {
      hasCapacitor,
      platform,
      capIsNative,
      heuristic,
      isNative
    });

    return isNative;
  } catch {
    return false;
  }
};


// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  // Enregistrer le service worker pour le cache offline
  useServiceWorker();
  
  // Gérer les liens profonds
  useDeepLinks();
  
  // Détecter si on est sur natif ou web
  const isNative = isNativeApp();
  
  // Gérer le splash screen uniquement sur natif
  const [showSplash, setShowSplash] = useState(() => {
    if (!isNative) return false;
    
    const splashShown = sessionStorage.getItem('splash-shown');
    return !splashShown;
  });

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem('splash-shown', 'true');
  };

  // Afficher le splash screen uniquement sur natif
  if (showSplash && isNative) {
    return <CustomSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="anisflix-theme">
          <LanguageProvider>
            <Suspense fallback={
              <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: 'hsl(220, 15%, 8%)',
                color: 'hsl(0, 0%, 95%)',
                fontSize: '18px'
              }}>
                <div>Chargement...</div>
              </div>
            }>
              {isNative ? <AppNative /> : <AppWeb />}
            </Suspense>
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
