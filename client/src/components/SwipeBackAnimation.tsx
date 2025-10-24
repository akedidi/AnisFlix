import { useEffect, useState } from 'react';

interface SwipeBackAnimationProps {
  isActive: boolean;
  progress: number; // 0 à 1
  onComplete: () => void;
}

export default function SwipeBackAnimation({ isActive, progress, onComplete }: SwipeBackAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    } else {
      // Délai pour permettre l'animation de sortie
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  useEffect(() => {
    if (progress >= 1 && isActive) {
      // Animation terminée, déclencher la navigation
      setTimeout(() => {
        onComplete();
      }, 100);
    }
  }, [progress, isActive, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 pointer-events-none ${
        isActive ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
    >
      {/* Overlay sombre */}
      <div 
        className="absolute inset-0 bg-black"
        style={{ 
          opacity: progress * 0.3,
          transform: `translateX(${progress * 20}px)`
        }}
      />
      
      {/* Indicateur de swipe */}
      <div 
        className="absolute top-1/2 left-4 w-1 h-16 bg-white rounded-full transform -translate-y-1/2"
        style={{ 
          opacity: progress,
          transform: `translateY(-50%) scaleY(${progress})`
        }}
      />
      
      {/* Texte d'indication */}
      <div 
        className="absolute top-1/2 left-12 transform -translate-y-1/2 text-white text-sm font-medium"
        style={{ 
          opacity: progress,
          transform: `translateY(-50%) translateX(${progress * 10}px)`
        }}
      >
        Retour
      </div>
    </div>
  );
}
