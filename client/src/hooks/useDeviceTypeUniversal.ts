import { isWeb } from '@/config/platform';

// Import conditionnel selon la plateforme
const useDeviceTypeWeb = isWeb 
  ? require('./useDeviceType').useDeviceType 
  : null;
const useDeviceTypeRN = !isWeb 
  ? require('./useDeviceTypeRN').useDeviceType 
  : null;

export function useDeviceType() {
  if (isWeb && useDeviceTypeWeb) {
    return useDeviceTypeWeb();
  } else if (!isWeb && useDeviceTypeRN) {
    return useDeviceTypeRN();
  } else {
    // Fallback
    return {
      isNative: !isWeb,
      isWeb,
      platform: 'unknown' as const,
      userAgent: 'Unknown'
    };
  }
}
