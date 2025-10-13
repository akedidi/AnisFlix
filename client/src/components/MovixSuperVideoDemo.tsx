// Demo component showing the complete Movix + SuperVideo flow
import React, { useState } from 'react';
import { useSuperVideoLinks, useSuperVideoExtraction, useHLSProxyUrl } from '@/hooks/useTMDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, AlertCircle, CheckCircle, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MovixSuperVideoDemoProps {
  className?: string;
}

export default function MovixSuperVideoDemo({ className }: MovixSuperVideoDemoProps) {
  const [imdbId, setImdbId] = useState('tt13186306'); // Default test ID
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Fetch SuperVideo links from Movix API
  const { data: superVideoLinks, isLoading: isLoadingLinks, error: linksError } = useSuperVideoLinks(
    imdbId, 
    mediaType
  );
  
  // Extract SuperVideo m3u8 when a SuperVideo link is selected
  const { data: masterM3u8, isLoading: isLoadingM3u8, error: m3u8Error } = useSuperVideoExtraction(
    selectedPlayer && selectedPlayer.includes('supervideo') ? selectedPlayer : null
  );
  
  // Get HLS proxy URL
  const { data: hlsProxyUrl, isLoading: isLoadingProxy } = useHLSProxyUrl(masterM3u8);

  // Update stream URL when HLS proxy URL is ready
  React.useEffect(() => {
    if (hlsProxyUrl) {
      setStreamUrl(hlsProxyUrl);
    }
  }, [hlsProxyUrl]);

  const handlePlayerSelect = (playerUrl: string) => {
    setSelectedPlayer(playerUrl);
    setStreamUrl(null); // Reset stream URL
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "URL copied successfully",
    });
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  // Don't render if no SuperVideo links are available
  if (!isLoadingLinks && (!superVideoLinks || superVideoLinks.length === 0)) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Movix + SuperVideo Flow Demo
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="imdbId">IMDB ID</Label>
              <Input
                id="imdbId"
                value={imdbId}
                onChange={(e) => setImdbId(e.target.value)}
                placeholder="tt13186306"
              />
            </div>
            <div>
              <Label htmlFor="mediaType">Media Type</Label>
              <Select value={mediaType} onValueChange={(value: 'movie' | 'tv') => setMediaType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="tv">TV Series</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 1: Movix API */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              1. Movix API
              <Badge variant="outline">https://api.movix.site/api/imdb/{mediaType}/{imdbId}</Badge>
            </h3>
            {isLoadingLinks ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading player links from Movix API...</span>
              </div>
            ) : linksError ? (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>Error: {linksError.message}</span>
              </div>
            ) : superVideoLinks && superVideoLinks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  <span>Found {superVideoLinks.length} SuperVideo link(s)</span>
                </div>
                {superVideoLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{link.player}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {link.is_hd ? 'HD' : 'SD'}
                      </span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {link.link.substring(0, 50)}...
                      </code>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.link)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInNewTab(link.link)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePlayerSelect(link.link)}
                        disabled={selectedPlayer === link.link}
                      >
                        {selectedPlayer === link.link ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertCircle className="h-4 w-4" />
                <span>No SuperVideo links found for this {mediaType}</span>
              </div>
            )}
          </div>

          {/* Step 2: SuperVideo Extraction */}
          {selectedPlayer && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                2. SuperVideo Extraction
                <Badge variant="outline">Puppeteer Scraper</Badge>
              </h3>
              {isLoadingM3u8 ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Extracting m3u8 link from SuperVideo...</span>
                </div>
              ) : m3u8Error ? (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to extract m3u8: {m3u8Error.message}</span>
                </div>
              ) : masterM3u8 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>M3U8 extracted successfully</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                      {masterM3u8}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(masterM3u8)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Step 3: HLS Proxy */}
          {masterM3u8 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                3. HLS Proxy
                <Badge variant="outline">Master.m3u8 → Index.m3u8 → Segments</Badge>
              </h3>
              {isLoadingProxy ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Setting up HLS proxy...</span>
                </div>
              ) : hlsProxyUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>HLS proxy ready</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded-lg">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                      {hlsProxyUrl}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(hlsProxyUrl)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Step 4: Video Player */}
          {streamUrl && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                4. Video Player
                <Badge variant="outline">Ready to Stream</Badge>
              </h3>
              <div className="space-y-2">
                <video
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '400px' }}
                  src={streamUrl}
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
              <div><strong>SuperVideo Links:</strong> {superVideoLinks?.length || 0}</div>
              <div><strong>Selected Player:</strong> {selectedPlayer ? 'Selected' : 'None'}</div>
              <div><strong>Master M3U8:</strong> {masterM3u8 ? 'Extracted' : 'Not extracted'}</div>
              <div><strong>Stream URL:</strong> {streamUrl ? 'Ready' : 'Not ready'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
