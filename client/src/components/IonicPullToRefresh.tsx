import React from 'react';
import {
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

  console.log('🔍 [IONIC PULL TO REFRESH] Enabled - rendering IonRefresher only');
  return (
    <>
      <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
        <IonRefresherContent
          pullingIcon="chevron-down"
          refreshingSpinner="circles"
          pullingText="Tirez pour rafraîchir"
          refreshingText="Chargement..."
        />
      </IonRefresher>
      {children}
    </>
  );
}
