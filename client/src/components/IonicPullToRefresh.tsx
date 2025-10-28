import React from 'react';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  isPlatform,
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
  const isNative = isPlatform("ios") || isPlatform("android");

  // Debug logs
  console.log('🔍 [IONIC PULL TO REFRESH] Platform detection:', {
    isIOS: isPlatform("ios"),
    isAndroid: isPlatform("android"),
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
