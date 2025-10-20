import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { useDeviceType } from '@/hooks/useDeviceType';

interface OfflineAlertProps {
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

export default function OfflineAlert({ onRefresh, showRefreshButton = true }: OfflineAlertProps) {
  const { isOffline } = useOffline();
  const { isNative } = useDeviceType();
  const [showAlert, setShowAlert] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isNative && isOffline) {
      setShowAlert(true);
      setWasOffline(true);
    } else if (isNative && !isOffline && wasOffline) {
      // Auto-hide alert when coming back online
      setTimeout(() => {
        setShowAlert(false);
      }, 2000);
    }
  }, [isOffline, isNative, wasOffline]);

  const handleDismiss = () => {
    setShowAlert(false);
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
    setShowAlert(false);
  };

  if (!isNative || !showAlert) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-4">
      <Alert className="border-orange-500 bg-orange-500/10">
        <WifiOff className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className="font-medium">Pas de connexion Internet</span>
            </div>
            <div className="flex items-center gap-2">
              {showRefreshButton && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  className="text-orange-500 border-orange-500 hover:bg-orange-500/20"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Actualiser
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-orange-500 hover:bg-orange-500/20"
              >
                OK
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
