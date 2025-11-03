import { IonPage } from '@ionic/react';
import { ReactNode } from 'react';
import { isNativeApp } from '../lib/platform';

interface PageWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper pour les pages qui ajoute IonPage sur natif UNIQUEMENT pour activer
 * les animations de navigation Ionic (push, swipe back, etc.)
 * Ce composant ne doit être utilisé QUE dans AppNative.tsx
 */
export default function PageWrapper({ children }: PageWrapperProps) {
  const isNative = isNativeApp();
  
  // LOGS DE DEBUG
  console.log('🔍 [PageWrapper] Debug:', {
    isNative,
    willWrapInIonPage: isNative
  });
  
  // Ne faire quelque chose que sur natif - sur web, retourner tel quel
  if (!isNative) {
    console.log('⚠️ [PageWrapper] Pas natif - retour direct des enfants');
    return <>{children}</>;
  }
  
  // Sur natif uniquement, wrapper dans IonPage pour activer les animations
  // CRITIQUE : IonPage doit être directement dans IonRouterOutlet pour les animations
  console.log('✅ [PageWrapper] Wrapping dans IonPage pour animations natives');
  return (
    <IonPage 
      style={{
        '--background': '#000000',
        '--color': '#ffffff',
      } as any}
    >
      {children}
    </IonPage>
  );
}

