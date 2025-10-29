import React from 'react';
import {
  IonPage,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
} from "@ionic/react";

interface IonicPullToRefreshProps {
  onRefresh: (event: CustomEvent<RefresherEventDetail>) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function IonicPullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false 
}: IonicPullToRefreshProps) {
  // Utiliser la détection Capacitor native
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
  
  // Vérifier la plateforme via Capacitor
  let isIOS = false;
  let isAndroid = false;
  
  if (isCapacitor) {
    const platform = (window as any).Capacitor.getPlatform();
    isIOS = platform === 'ios';
    isAndroid = platform === 'android';
  }
  
  // Fallback avec user agent si Capacitor ne fonctionne pas
  if (!isIOS && !isAndroid) {
    isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    isAndroid = /Android/.test(navigator.userAgent);
  }
  
  const isNative = isCapacitor && (isIOS || isAndroid);

  // Debug logs
  console.log('🔍 [IONIC PULL TO REFRESH] Platform detection:', {
    isCapacitor: isCapacitor,
    capacitorPlatform: isCapacitor ? (window as any).Capacitor.getPlatform() : 'N/A',
    isIOS: isIOS,
    isAndroid: isAndroid,
    isNative: isNative,
    disabled: disabled,
    userAgent: navigator.userAgent
  });

  // Ne pas afficher sur le web ou si désactivé
  if (!isNative || disabled) {
    console.log('🔍 [IONIC PULL TO REFRESH] Disabled - returning children only');
    return <>{children}</>;
  }

  console.log('🔍 [IONIC PULL TO REFRESH] Enabled - rendering IonPage with IonContent');
  return (
    <IonPage>
      <IonContent 
        style={{
          '--background': 'transparent',
          '--color': 'inherit'
        } as any}
        className="ion-content-transparent"
      >
        <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
          <IonRefresherContent
            refreshingSpinner="circles"
            pullingText="Tirez pour rafraîchir"
            refreshingText="Chargement..."
            style={{
              '--color': '#FFFFFF',
              '--background': 'transparent',
              'background': 'transparent',
              'padding': '0px'
            } as any}
          />
        </IonRefresher>
        <div style={{ background: 'transparent', minHeight: '100vh' }}>
          {children}
        </div>
      </IonContent>
    </IonPage>
  );
}
