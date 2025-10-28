import React from 'react';
import {
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

  // Ne pas afficher sur le web ou si désactivé
  if (!isNative || disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <IonRefresher slot="fixed" onIonRefresh={onRefresh}>
        <IonRefresherContent
          pullingIcon="arrow-down-outline"
          refreshingSpinner="circles"
          pullingText="Tirez pour rafraîchir"
          refreshingText="Chargement..."
        />
      </IonRefresher>
      {children}
    </>
  );
}
