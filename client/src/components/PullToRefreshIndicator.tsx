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

  console.log('🔄 [INDICATOR] ===== RENDER =====');
  console.log('🔄 [INDICATOR] isRefreshing:', isRefreshing);
  console.log('🔄 [INDICATOR] isPulling:', isPulling);
  console.log('🔄 [INDICATOR] pullDistance:', pullDistance);
  console.log('🔄 [INDICATOR] threshold:', threshold);
  console.log('🔄 [INDICATOR] shouldShow:', shouldShow);

  if (!shouldShow) {
    console.log('🔄 [INDICATOR] ❌ Pas d\'affichage - shouldShow = false');
    return null;
  }

  console.log('🔄 [INDICATOR] ✅ AFFICHAGE DE L\'INDICATEUR');

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
