import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useServiceWorker } from "@/hooks/useOffline";
import { useDeepLinks } from "@/hooks/useDeepLinks";
import ErrorBoundary from "@/components/ErrorBoundary";

// Import des styles pour le clavier natif et tabbar
import "@/styles/native-keyboard.css";
import "@/styles/tabbar.css";

// Lazy load des composants App selon la plateforme
const AppWeb = lazy(() => import("@/AppWeb"));

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

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="anisflix-theme">
          <LanguageProvider>
            <Suspense fallback={(
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
            )}>
              <AppWeb />
            </Suspense>
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
