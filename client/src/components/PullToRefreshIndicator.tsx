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
      className="fixed top-4 left-1/2 z-[100] transition-all duration-200"
      style={{
        transform: `translateX(-50%) translateY(${Math.max(0, pullDistance - 40)}px)`,
        opacity: shouldShow ? 1 : 0
      }}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full p-2 shadow-lg min-w-[120px]">
        <div className="flex flex-col items-center justify-center space-y-1">
          <RefreshCw 
            className={`w-5 h-5 text-primary transition-all duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: `rotate(${rotation}deg) scale(${scale})`,
              opacity: Math.max(0.3, progress)
            }}
          />
          {isRefreshing && (
            <div className="text-xs text-muted-foreground text-center whitespace-nowrap">
              Actualisation...
            </div>
          )}
          {isPulling && !isRefreshing && (
            <div className="text-xs text-muted-foreground text-center whitespace-nowrap">
              Relâchez pour actualiser
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
