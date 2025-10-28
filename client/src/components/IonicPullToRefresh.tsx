import React from 'react';
import {
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
  // Utiliser la détection Capacitor native au lieu d'Ionic isPlatform
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isNative = isCapacitor && (isIOS || isAndroid);

  // Debug logs
  console.log('🔍 [IONIC PULL TO REFRESH] Platform detection:', {
    isCapacitor: isCapacitor,
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

  console.log('🔍 [IONIC PULL TO REFRESH] Enabled - rendering IonContent with IonRefresher');
  return (
    <IonContent>
      <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
        <IonRefresherContent
          pullingIcon="arrow-down-outline"
          refreshingSpinner="circles"
          pullingText="Tirez pour rafraîchir"
          refreshingText="Chargement..."
        />
      </IonRefresher>
      {children}
    </IonContent>
  );
}
