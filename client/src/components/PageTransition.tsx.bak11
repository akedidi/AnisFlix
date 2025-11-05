import React, { useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (currentChildren !== children) {
      setIsAnimating(true);
      setIsVisible(false);
      setAnimationClass('page-exit');
      
      // Délai pour l'animation de sortie
      const exitTimer = setTimeout(() => {
        setCurrentChildren(children);
        setIsVisible(true);
        setAnimationClass('page-enter');
        
        // Délai pour l'animation d'entrée
        const enterTimer = setTimeout(() => {
          setIsAnimating(false);
          setAnimationClass('');
        }, 300);
        
        return () => clearTimeout(enterTimer);
      }, 200);
      
      return () => clearTimeout(exitTimer);
    }
  }, [children, currentChildren]);

  return (
    <div 
      className={`
        ${animationClass}
        ${isAnimating ? 'pointer-events-none' : ''}
        ${className}
      `}
    >
      {currentChildren}
    </div>
  );
}

// Composant pour les transitions de page avec des animations plus avancées
export function AdvancedPageTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    if (currentChildren !== children) {
      setIsAnimating(true);
      setIsVisible(false);
      
      // Détecter la direction de navigation (simplifié)
      setDirection('forward');
      
      const exitTimer = setTimeout(() => {
        setCurrentChildren(children);
        setIsVisible(true);
        
        const enterTimer = setTimeout(() => {
          setIsAnimating(false);
        }, 200);
        
        return () => clearTimeout(enterTimer);
      }, 250);
      
      return () => clearTimeout(exitTimer);
    }
  }, [children, currentChildren]);

  return (
    <div 
      className={`
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'opacity-100 translate-x-0 scale-100' 
          : direction === 'forward' 
            ? 'opacity-0 translate-x-8 scale-95' 
            : 'opacity-0 -translate-x-8 scale-95'
        }
        ${isAnimating ? 'pointer-events-none' : ''}
        ${className}
      `}
      style={{
        transformOrigin: 'center center',
      }}
    >
      {currentChildren}
    </div>
  );
}

// Composant pour les transitions avec effet de fondu
export function FadeTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);

  useEffect(() => {
    if (currentChildren !== children) {
      setIsVisible(false);
      
      const timer = setTimeout(() => {
        setCurrentChildren(children);
        setIsVisible(true);
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [children, currentChildren]);

  return (
    <div 
      className={`
        transition-opacity duration-200 ease-in-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${className}
      `}
    >
      {currentChildren}
    </div>
  );
}

// Composant pour les transitions avec effet de glissement
export function SlideTransition({ children, className = '' }: PageTransitionProps) {
  const [location] = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [currentChildren, setCurrentChildren] = useState(children);

  useEffect(() => {
    if (currentChildren !== children) {
      setIsVisible(false);
      
      const timer = setTimeout(() => {
        setCurrentChildren(children);
        setIsVisible(true);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [children, currentChildren]);

  return (
    <div 
      className={`
        transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : 'translate-y-6'}
        ${className}
      `}
    >
      {currentChildren}
    </div>
  );
}
