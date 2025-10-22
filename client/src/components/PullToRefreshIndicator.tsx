import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
  threshold: number;
}

export default function PullToRefreshIndicator({
  isRefreshing,
  pullDistance,
  isPulling,
  threshold
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = isPulling || isRefreshing;
  const rotation = progress * 180;
  const scale = 0.5 + (progress * 0.5);

  console.log('🔄 [INDICATOR] shouldShow:', shouldShow, 'pullDistance:', pullDistance, 'progress:', progress);

  if (!shouldShow) return null;

  return (
    <div 
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-200"
      style={{
        transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 40)}px)`,
        opacity: shouldShow ? 1 : 0
      }}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full p-3 shadow-lg">
        <div className="flex items-center justify-center">
          <RefreshCw 
            className={`w-6 h-6 text-primary transition-all duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              opacity: Math.max(0.3, progress)
            }}
          />
        </div>
        {isRefreshing && (
          <div className="text-xs text-muted-foreground text-center mt-1">
            Actualisation...
          </div>
        )}
        {isPulling && !isRefreshing && (
          <div className="text-xs text-muted-foreground text-center mt-1">
            Relâchez pour actualiser
          </div>
        )}
      </div>
    </div>
  );
}
