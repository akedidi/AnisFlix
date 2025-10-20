import * as React from "react";
import { Dimensions } from 'react-native';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Web environment
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      const onChange = () => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      };
      mql.addEventListener("change", onChange);
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      return () => mql.removeEventListener("change", onChange);
    } else {
      // React Native environment
      const { width } = Dimensions.get('window');
      setIsMobile(width < MOBILE_BREAKPOINT);
      
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setIsMobile(window.width < MOBILE_BREAKPOINT);
      });
      
      return () => subscription?.remove();
    }
  }, []);

  return !!isMobile;
}
