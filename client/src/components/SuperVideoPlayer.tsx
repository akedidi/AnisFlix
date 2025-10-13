// SuperVideo Player Component
import React, { useState, useEffect, useRef } from 'react';
import { useMovixPlayerLinks, useSuperVideoExtraction, useHLSProxyUrl } from '@/hooks/useTMDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, AlertCircle, CheckCircle } from 'lucide-react';

interface SuperVideoPlayerProps {
  imdbId: string | null;
  mediaType: 'movie' | 'tv';
  title?: string;
}

export default function SuperVideoPlayer({ imdbId, mediaType, title }: SuperVideoPlayerProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch Movix player links
  const { data: movixLinks, isLoading: isLoadingLinks } = useMovixPlayerLinks(imdbId, mediaType);
  
  // Extract SuperVideo m3u8 when a SuperVideo link is selected
  const { data: masterM3u8, isLoading: isLoadingM3u8, error: m3u8Error } = useSuperVideoExtraction(
    selectedPlayer && selectedPlayer.includes('supervideo') ? selectedPlayer : null
  );
  
  // Get HLS proxy URL
  const { data: hlsProxyUrl, isLoading: isLoadingProxy } = useHLSProxyUrl(masterM3u8);

  // Update stream URL when HLS proxy URL is ready
  useEffect(() => {
    if (hlsProxyUrl) {
      setStreamUrl(hlsProxyUrl);
    }
  }, [hlsProxyUrl]);

  // Filter SuperVideo links
  const superVideoLinks = movixLinks?.player_links?.filter(link => 
    link.player === 'supervideo' && 
    (link.link.includes('supervideo.cc/e/') || link.link.includes('supervideo.my/e/'))
  ) || [];

  const handlePlayerSelect = (playerUrl: string) => {
    setSelectedPlayer(playerUrl);
    setStreamUrl(null); // Reset stream URL
  };

  const handlePlay = () => {
    if (videoRef.current && streamUrl) {
      videoRef.current.src = streamUrl;
      videoRef.current.load();
    }
  };

  if (!imdbId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SuperVideo Player</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No IMDB ID provided</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          SuperVideo Player
          {title && <span className="text-sm font-normal text-muted-foreground">- {title}</span>}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Step 1: Player Links */}
        <div>
          <h3 className="font-semibold mb-2">1. Available SuperVideo Links</h3>
          {isLoadingLinks ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading player links...</span>
            </div>
          ) : superVideoLinks.length > 0 ? (
            <div className="space-y-2">
              {superVideoLinks.map((link, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{link.player}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {link.is_hd ? 'HD' : 'SD'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePlayerSelect(link.link)}
                    disabled={selectedPlayer === link.link}
                  >
                    {selectedPlayer === link.link ? 'Selected' : 'Select'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No SuperVideo links available</p>
          )}
        </div>

        {/* Step 2: M3U8 Extraction */}
        {selectedPlayer && (
          <div>
            <h3 className="font-semibold mb-2">2. M3U8 Extraction</h3>
            {isLoadingM3u8 ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Extracting m3u8 link...</span>
              </div>
            ) : m3u8Error ? (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to extract m3u8: {m3u8Error.message}</span>
              </div>
            ) : masterM3u8 ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <span>M3U8 extracted successfully</span>
                <Badge variant="outline" className="text-xs">
                  {masterM3u8.substring(0, 50)}...
                </Badge>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 3: HLS Proxy */}
        {masterM3u8 && (
          <div>
            <h3 className="font-semibold mb-2">3. HLS Proxy</h3>
            {isLoadingProxy ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Setting up HLS proxy...</span>
              </div>
            ) : hlsProxyUrl ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <span>HLS proxy ready</span>
                <Badge variant="outline" className="text-xs">
                  {hlsProxyUrl.substring(0, 50)}...
                </Badge>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 4: Video Player */}
        {streamUrl && (
          <div>
            <h3 className="font-semibold mb-2">4. Video Player</h3>
            <div className="space-y-2">
              <Button onClick={handlePlay} className="w-full">
                <Play className="h-4 w-4 mr-2" />
                Play Video
              </Button>
              
              <video
                ref={videoRef}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: '400px' }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Debug Info</h4>
          <div className="text-xs space-y-1">
            <div><strong>IMDB ID:</strong> {imdbId}</div>
            <div><strong>Media Type:</strong> {mediaType}</div>
            <div><strong>Selected Player:</strong> {selectedPlayer || 'None'}</div>
            <div><strong>Master M3U8:</strong> {masterM3u8 ? 'Extracted' : 'Not extracted'}</div>
            <div><strong>Stream URL:</strong> {streamUrl ? 'Ready' : 'Not ready'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
