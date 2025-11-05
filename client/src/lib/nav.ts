import { useMemo } from 'react';
import { useLocation as useWouterLocation, useParams as useWouterParams } from 'wouter';

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const hasCapacitor = (window as any).Capacitor !== undefined;
  const isWeb = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  return hasCapacitor && !isWeb;
}

export function useNav() {
  const [, setLocation] = useWouterLocation();

  const api = useMemo(() => ({
    push: (path: string) => {
      if (!path) return;
      setLocation(path);
    },
    replace: (path: string) => {
      if (!path) return;
      setLocation(path);
    },
  }), [setLocation]);

  return api;
}

export function useParamsAdapter<T extends Record<string, string | undefined> = any>(): T {
  return (useWouterParams() as any) as T;
}


