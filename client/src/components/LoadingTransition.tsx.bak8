import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingTransitionProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function LoadingTransition({ isLoading, children, className = '' }: LoadingTransitionProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Composant pour les transitions de chargement avec animation de fondu
export function FadeLoadingTransition({ isLoading, children, className = '' }: LoadingTransitionProps) {
  return (
    <div className={`transition-opacity duration-300 ${className}`}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px] opacity-100">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        </div>
      ) : (
        <div className="opacity-100 fade-in-up">
          {children}
        </div>
      )}
    </div>
  );
}

// Composant pour les transitions de chargement avec skeleton
export function SkeletonLoadingTransition({ isLoading, children, className = '' }: LoadingTransitionProps) {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0">
                <div className="w-40 h-60 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded mt-2 w-3/4"></div>
                <div className="h-3 bg-muted rounded mt-1 w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <div className="fade-in-up">{children}</div>;
}
