import { useLocation } from 'wouter';
import { useIonRouter } from '@ionic/react';
import { isNativeApp } from './nativeNavigation';

/**
 * Hook de navigation unifié pour Web et Native
 * 
 * - En mode Web : utilise Wouter (setLocation)
 * - En mode Native : utilise IonRouter (push)
 * 
 * Cela évite les rechargements complets de page en mode natif
 * et préserve l'état des tabs Ionic.
 */
export const useAppNavigation = () => {
  const [, setLocation] = useLocation();
  const ionRouter = useIonRouter();
  const isNative = isNativeApp();

  /**
   * Naviguer vers une route
   * @param path - Chemin de la route (ex: "/movie/123" ou "/tabs/movie/123")
   */
  const navigate = (path: string) => {
    if (isNative) {
      // En mode natif, utiliser IonRouter pour navigation SPA
      ionRouter.push(path, 'forward', 'push');
    } else {
      // En mode web, utiliser Wouter
      setLocation(path);
    }
  };

  /**
   * Revenir en arrière
   */
  const goBack = () => {
    if (isNative) {
      ionRouter.goBack();
    } else {
      window.history.back();
    }
  };

  return {
    navigate,
    goBack,
    isNative,
  };
};
