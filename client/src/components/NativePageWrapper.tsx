import { IonPage, IonContent, IonRefresher, IonRefresherContent } from '@ionic/react';
import { ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface NativePageWrapperProps {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
  enableRefresh?: boolean; // Activer/désactiver le refresh (par défaut: true pour listes, false pour détails)
  fullscreen?: boolean; // Mode plein écran (par défaut: true)
}

/**
 * Wrapper pour les pages natives
 * Enveloppe le contenu dans IonPage + IonContent pour Ionic
 * Inclut optionnellement le pull-to-refresh (IonRefresher)
 */
export default function NativePageWrapper({ 
  children, 
  onRefresh, 
  enableRefresh = true,
  fullscreen = true 
}: NativePageWrapperProps) {
  console.log('✅ [NativePageWrapper] Rendering page wrapper', { enableRefresh, fullscreen });
  const { t } = useLanguage();
  
  const handleRefresh = async (event: CustomEvent) => {
    console.log('🔄 [NativePageWrapper] Pull to refresh triggered');
    
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // Par défaut, recharger la page
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ [NativePageWrapper] Refresh error:', error);
    } finally {
      // Compléter le refresh
      event.detail.complete();
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen={fullscreen}>
        {/* Pull to refresh sur natif - uniquement si activé */}
        {enableRefresh && (
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent
              pullingText={t("refresh.pulling")}
              refreshingSpinner="circles"
              refreshingText={t("refresh.loading")}
            />
          </IonRefresher>
        )}
        
        {/* Contenu de la page avec safe-area top et bottom */}
        <div style={{
          minHeight: '100vh',
          paddingTop: 'env(safe-area-inset-top, 20px)',
          paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 20px))'
        }}>
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
}

