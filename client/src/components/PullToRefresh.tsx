import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useDeviceType } from '@/hooks/useDeviceType';

interface PullToRefreshProps {
  onRefresh: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false 
}: PullToRefreshProps) {
  const { isNative } = useDeviceType();
  const { isRefreshing, pullDistance, pullProgress, shouldTrigger } = usePullToRefresh({
    onRefresh,
    disabled: disabled || !isNative
  });

  if (!isNative) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-4 bg-background/95 backdrop-blur"
          style={{
            transform: `translateY(${Math.min(pullDistance * 0.5, 60)}px)`,
            opacity: Math.min(pullProgress * 2, 1)
          }}
        >
          <div className={`flex items-center gap-2 text-muted-foreground ${
            shouldTrigger ? 'text-primary' : ''
          }`}>
            <RefreshCw 
              className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''} ${
                shouldTrigger ? 'text-primary' : ''
              }`}
            />
            <span className="text-sm font-medium">
              {isRefreshing 
                ? 'Actualisation...' 
                : shouldTrigger 
                  ? 'Relâchez pour actualiser' 
                  : 'Tirez vers le bas pour actualiser'
              }
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div 
        style={{
          transform: `translateY(${Math.min(pullDistance * 0.3, 30)}px)`,
          transition: isRefreshing ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
