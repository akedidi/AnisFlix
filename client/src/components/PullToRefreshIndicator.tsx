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
  const shouldShow = isPulling || isRefreshing;

  console.log('🔄 [INDICATOR] shouldShow:', shouldShow, 'pullDistance:', pullDistance);

  if (!shouldShow) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-4">
      <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm">
        {isRefreshing ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Actualisation...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Relâchez pour actualiser
          </div>
        )}
      </div>
    </div>
  );
}
