import { lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useServiceWorker } from "@/hooks/useOffline";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import CustomSplashScreen from "@/components/CustomSplashScreen";

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
  
  const hasCapacitor = (window as any).Capacitor !== undefined;
  
  if (!hasCapacitor) return false;
  
  // Vérifier la plateforme Capacitor
  const platform = (window as any).Capacitor?.getPlatform?.();
  
  // Natif = ios ou android
  const isNative = platform === 'ios' || platform === 'android';
  
  console.log('[App] Platform detection:', {
    hasCapacitor,
    platform,
    isNative
  });
  
  return isNative;
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="anisflix-theme">
        <LanguageProvider>
          <Suspense fallback={<div>Loading...</div>}>
            {isNative ? <AppNative /> : <AppWeb />}
          </Suspense>
          <Toaster />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
