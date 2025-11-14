import { Button } from "@/components/ui/button";
import { Cast } from "lucide-react";
import { useChromecast } from "@/hooks/useChromecast";
import { useState, useEffect, useRef } from "react";

interface ChromecastButtonProps {
  mediaUrl: string;
  title: string;
  posterUrl?: string;
  currentTime?: number;
  className?: string;
  variant?: "default" | "secondary" | "ghost";
  size?: "sm" | "icon" | "lg";
}

// Fonction pour convertir les URLs localhost en IP locale accessible par Chromecast
const getAccessibleUrl = (url: string): string => {
  // Si l'URL contient localhost ou 127.0.0.1, la remplacer par l'IP locale
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Utiliser window.location.hostname pour obtenir l'IP ou hostname actuel
    const currentHost = window.location.hostname;
    const currentPort = window.location.port || '3000';
    
    console.log('[ChromecastButton] Conversion URL localhost:', {
      original: url,
      currentHost,
      currentPort
    });
    
    // Si on est déjà sur une IP locale, l'utiliser
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      return url.replace(/localhost:?\d*/g, `${currentHost}:${currentPort}`)
                .replace(/127\.0\.0\.1:?\d*/g, `${currentHost}:${currentPort}`);
    }
    
    // Sinon, avertir l'utilisateur
    console.warn('[ChromecastButton] URL localhost détectée mais pas d\'IP locale disponible');
  }
  
  return url;
};

export default function ChromecastButton({
  mediaUrl,
  title,
  posterUrl,
  currentTime = 0,
  className = "",
  variant = "ghost",
  size = "icon",
}: ChromecastButtonProps) {
  const { isAvailable, isConnected, isConnecting, currentDevice, showPicker, cast, disconnect } = useChromecast();
  const [isCasting, setIsCasting] = useState(false);
  const mediaUrlRef = useRef(mediaUrl);
  const titleRef = useRef(title);
  const posterUrlRef = useRef(posterUrl);
  const currentTimeRef = useRef(currentTime);

  // Mettre à jour les refs quand les props changent
  useEffect(() => {
    mediaUrlRef.current = mediaUrl;
    titleRef.current = title;
    posterUrlRef.current = posterUrl;
    currentTimeRef.current = currentTime;
  }, [mediaUrl, title, posterUrl, currentTime]);

  // Si on est déjà connecté et qu'on n'est pas en train de caster, caster automatiquement
  useEffect(() => {
    if (isConnected && !isCasting && mediaUrlRef.current) {
      // Convertir l'URL localhost en IP locale accessible par Chromecast
      const accessibleUrl = getAccessibleUrl(mediaUrlRef.current);
      const accessiblePosterUrl = posterUrlRef.current ? getAccessibleUrl(posterUrlRef.current) : undefined;
      
      console.log('[ChromecastButton] Cast avec URL accessible:', {
        original: mediaUrlRef.current,
        accessible: accessibleUrl
      });
      
      cast(accessibleUrl, titleRef.current, accessiblePosterUrl, currentTimeRef.current)
        .then(() => {
          setIsCasting(true);
        })
        .catch((error) => {
          console.error('[ChromecastButton] Erreur lors du cast:', error);
          setIsCasting(false);
          // Afficher un message à l'utilisateur
          const errorMessage = error.message || 'Format vidéo incompatible ou URL non accessible';
          alert(`Erreur Chromecast: ${errorMessage}`);
        });
    } else if (!isConnected && isCasting) {
      setIsCasting(false);
    }
  }, [isConnected, cast, isCasting]);

  if (!isAvailable) {
    return null; // Ne pas afficher le bouton si Chromecast n'est pas disponible
  }

  const handleClick = async () => {
    if (isConnected) {
      disconnect();
      setIsCasting(false);
    } else {
      // Si on n'est pas connecté, ouvrir le picker
      // Une fois connecté, le useEffect ci-dessus lancera automatiquement le cast
      showPicker();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
      disabled={isConnecting}
      title={
        isConnecting
          ? "Connexion en cours..."
          : isConnected
          ? `Connecté à ${currentDevice?.friendlyName || "Chromecast"} - Cliquer pour déconnecter`
          : "Diffuser sur Chromecast"
      }
    >
      <Cast
        className={`w-5 h-5 ${isConnected || isCasting ? "fill-current" : ""}`}
        style={{
          color: isConnected || isCasting ? "#3b82f6" : undefined,
        }}
      />
    </Button>
  );
}
