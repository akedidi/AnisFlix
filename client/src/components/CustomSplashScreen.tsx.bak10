import React, { useEffect, useState } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';

interface CustomSplashScreenProps {
  onFinish: () => void;
}

const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({ onFinish }) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const showCustomSplash = async () => {
      // Masquer le splash screen natif
      await SplashScreen.hide();
      
      // Afficher notre splash screen personnalisé pendant 2 secondes
      setTimeout(() => {
        setShowSplash(false);
        onFinish();
      }, 2000);
    };

    showCustomSplash();
  }, [onFinish]);

  if (!showSplash) return null;

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4 tracking-wider">
          ANISFLIX
        </h1>
        <div className="w-16 h-1 bg-red-600 mx-auto animate-pulse"></div>
      </div>
    </div>
  );
};

export default CustomSplashScreen;
