import React from 'react';
import { isWeb } from '@/config/platform';

// Import conditionnel selon la plateforme
const WebVideoPlayer = React.lazy(() => import('./VideoPlayer'));
const NativeVideoPlayer = React.lazy(() => import('./VideoPlayerRN'));

interface VideoPlayerProps {
  src: string;
  type?: "m3u8" | "mp4" | "auto";
  title?: string;
  onClose?: () => void;
  mediaId?: number;
  mediaType?: any;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
}

export default function VideoPlayerUniversal(props: VideoPlayerProps) {
  if (isWeb) {
    return (
      <React.Suspense fallback={<div>Chargement du lecteur vidéo...</div>}>
        <WebVideoPlayer {...props} />
      </React.Suspense>
    );
  } else {
    return (
      <React.Suspense fallback={<div>Chargement du lecteur vidéo...</div>}>
        <NativeVideoPlayer {...props} />
      </React.Suspense>
    );
  }
}
