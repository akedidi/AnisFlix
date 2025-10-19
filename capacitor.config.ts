import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anisflix.app',
  appName: 'AnisFlix',
  webDir: 'dist/public',
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#000000',
    allowsLinkPreview: false,
    handleApplicationNotifications: true,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    allowsAirPlayForMediaPlayback: true,
    allowsPictureInPictureMediaPlayback: true
  }
};

export default config;
