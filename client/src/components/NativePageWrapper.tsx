import { IonPage, IonContent, IonRefresher, IonRefresherContent } from '@ionic/react';
import { ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface NativePageWrapperProps {
  children: ReactNode;
  onRefresh?: () => void;
}

/**
 * Wrapper pour les pages natives
 * Enveloppe le contenu dans IonPage + IonContent pour Ionic
 * Inclut le pull-to-refresh (IonRefresher) pour toutes les pages
 */
export default function NativePageWrapper({ children, onRefresh }: NativePageWrapperProps) {
  console.log('✅ [NativePageWrapper] Rendering page wrapper');
  const { t } = useLanguage();
  
  const handleRefresh = (event: CustomEvent) => {
    console.log('🔄 [NativePageWrapper] Pull to refresh triggered');
    
    if (onRefresh) {
      onRefresh();
    } else {
      // Par défaut, recharger la page
      window.location.reload();
    }
    
    // Compléter le refresh après 2 secondes
    setTimeout(() => {
      event.detail.complete();
    }, 2000);
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        {/* Pull to refresh sur natif - disponible sur toutes les pages */}
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingText={t("refresh.pulling")}
            refreshingSpinner="circles"
            refreshingText={t("refresh.loading")}
          />
        </IonRefresher>
        
        {/* Contenu de la page */}
        <div style={{
          minHeight: '100vh',
          paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 20px))'
        }}>
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
}

