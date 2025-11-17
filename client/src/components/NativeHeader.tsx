import { IonBackButton, IonButtons, IonHeader, IonToolbar, IonTitle, IonSearchbar } from '@ionic/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useNativeDetection } from '@/hooks/useNativeDetection';
import { useState } from 'react';

interface NativeHeaderProps {
  title?: string;
  showBackButton?: boolean;
  defaultHref?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
}

/**
 * Header natif avec bouton retour iOS/Android style
 * Utilise IonBackButton pour la navigation native push/pop
 * Visible uniquement en mode natif
 * Fixe en dessous de l'encoche avec safe-area
 */
export default function NativeHeader({ 
  title, 
  showBackButton = false,
  defaultHref = '/tabs/home',
  showSearch = false,
  onSearch,
  searchPlaceholder
}: NativeHeaderProps) {
  const { t } = useLanguage();
  const { isNativeMobile } = useNativeDetection();
  const [searchQuery, setSearchQuery] = useState('');

  // N'afficher que en mode natif
  if (!isNativeMobile) return null;

  const handleSearchChange = (e: CustomEvent) => {
    const value = e.detail.value || '';
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <IonHeader translucent className="ion-no-border">
      <IonToolbar>
        {showBackButton && (
          <IonButtons slot="start">
            <IonBackButton 
              defaultHref={defaultHref}
              text={t("nav.back") || "Retour"}
            />
          </IonButtons>
        )}
        {title && !showSearch && <IonTitle>{title}</IonTitle>}
        {showSearch && (
          <IonSearchbar
            value={searchQuery}
            onIonInput={handleSearchChange}
            placeholder={searchPlaceholder || t("search.placeholder") || "Rechercher..."}
            debounce={300}
            animated
            showClearButton="focus"
          />
        )}
      </IonToolbar>
    </IonHeader>
  );
}
