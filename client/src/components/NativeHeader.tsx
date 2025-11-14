import { IonBackButton, IonButtons, IonHeader, IonToolbar, IonTitle } from '@ionic/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface NativeHeaderProps {
  title?: string;
  showBackButton?: boolean;
  defaultHref?: string;
}

/**
 * Header natif avec bouton retour iOS/Android style
 * Utilise IonBackButton pour la navigation native push/pop
 */
export default function NativeHeader({ 
  title, 
  showBackButton = false,
  defaultHref = '/tabs/home' 
}: NativeHeaderProps) {
  const { t } = useLanguage();

  return (
    <IonHeader translucent>
      <IonToolbar>
        {showBackButton && (
          <IonButtons slot="start">
            <IonBackButton 
              defaultHref={defaultHref}
              text={t("nav.back") || "Retour"}
            />
          </IonButtons>
        )}
        {title && <IonTitle>{title}</IonTitle>}
      </IonToolbar>
    </IonHeader>
  );
}
