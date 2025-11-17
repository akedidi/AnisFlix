import { useParams as useReactRouterParams } from "react-router-dom";
import { useParams as useWouterParams } from "wouter";
import { useNativeDetection } from "./useNativeDetection";

/**
 * Hook universel pour récupérer les paramètres de route
 * Utilise react-router-dom en mode natif, wouter en mode web
 */
export function useRouteParams<T extends Record<string, string>>(): T {
  const { isNativeMobile } = useNativeDetection();
  
  // En mode natif, utiliser react-router-dom
  if (isNativeMobile) {
    return useReactRouterParams() as T;
  }
  
  // En mode web, utiliser wouter
  return useWouterParams() as T;
}
