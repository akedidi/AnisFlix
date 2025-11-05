import React, { ComponentType } from 'react';
import { Route } from 'wouter';
import PageTransition from './PageTransition';

interface TransitionRouteProps {
  path: string;
  component: ComponentType<any>;
  transitionType?: 'default' | 'fade' | 'slide' | 'advanced';
  className?: string;
}

export default function TransitionRoute({ 
  path, 
  component: Component, 
  transitionType = 'default',
  className = ''
}: TransitionRouteProps) {
  const renderComponent = (props: any) => {
    const content = <Component {...props} />;
    
    switch (transitionType) {
      case 'fade':
        return (
          <PageTransition className={className}>
            {content}
          </PageTransition>
        );
      case 'slide':
        return (
          <PageTransition className={className}>
            {content}
          </PageTransition>
        );
      case 'advanced':
        return (
          <PageTransition className={className}>
            {content}
          </PageTransition>
        );
      default:
        return (
          <PageTransition className={className}>
            {content}
          </PageTransition>
        );
    }
  };

  return <Route path={path} component={renderComponent} />;
}

// Hook pour gérer les transitions personnalisées
export function usePageTransition() {
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  
  const startTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };
  
  return { isTransitioning, startTransition };
}
