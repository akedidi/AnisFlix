import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Play, ExternalLink, Copy, Check } from 'lucide-react';
import { useMovixDownloadMovie, useMovixDownloadSeries } from '@/hooks/useMovixDownload';

export default function MovixDownloadTest() {
  const [movieId, setMovieId] = useState('164177');
  const [seriesId, setSeriesId] = useState('2160050');
  const [season, setSeason] = useState('1');
  const [episode, setEpisode] = useState('1');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const { 
    data: movieData, 
    isLoading: isLoadingMovie, 
    error: movieError,
    refetch: refetchMovie 
  } = useMovixDownloadMovie(parseInt(movieId));

  const { 
    data: seriesData, 
    isLoading: isLoadingSeries, 
    error: seriesError,
    refetch: refetchSeries 
  } = useMovixDownloadSeries(parseInt(seriesId), parseInt(season), parseInt(episode));

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const testMovieAPI = async () => {
    try {
      const response = await fetch(`https://api.movix.site/api/films/download/${movieId}`);
      const data = await response.json();
      
      console.log('Movie API Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      return data;
    } catch (error) {
      console.error('Movie API Error:', error);
      return null;
    }
  };

  const testSeriesAPI = async () => {
    try {
      const response = await fetch(`https://api.movix.site/api/series/download/${seriesId}/season/${season}/episode/${episode}`);
      const data = await response.json();
      
      console.log('Series API Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      return data;
    } catch (error) {
      console.error('Series API Error:', error);
      return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Test API MovixDownload
          </CardTitle>
          <CardDescription>
            Test de l'intégration de l'API Download de Movix pour récupérer les sources Darkibox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Films */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Films</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="movieId">ID Film TMDB</Label>
                <Input
                  id="movieId"
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  placeholder="164177"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetchMovie()} disabled={isLoadingMovie}>
                  {isLoadingMovie ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tester'}
                </Button>
                <Button onClick={testMovieAPI} variant="outline">
                  Test API Direct
                </Button>
              </div>
            </div>

            {movieError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Erreur Film:</h4>
                <p className="text-sm text-red-600">{movieError.message}</p>
              </div>
            )}

            {movieData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Film</Badge>
                  <span className="text-sm text-muted-foreground">
                    {movieData.sources.length} sources trouvées
                  </span>
                </div>

                <div className="grid gap-3">
                  {movieData.sources.map((source, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{source.quality}</Badge>
                          <Badge variant="outline">{source.language}</Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(source.m3u8)}
                        >
                          {copiedUrl === source.m3u8 ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>URL:</strong> 
                          <a 
                            href={source.src} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-600 hover:underline"
                          >
                            {source.src.substring(0, 50)}...
                          </a>
                        </p>
                        <p><strong>M3U8:</strong> 
                          <a 
                            href={source.m3u8} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-1 text-green-600 hover:underline"
                          >
                            {source.m3u8.substring(0, 50)}...
                          </a>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Test Séries */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Séries</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="seriesId">ID Série TMDB</Label>
                <Input
                  id="seriesId"
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  placeholder="2160050"
                />
              </div>
              <div>
                <Label htmlFor="season">Saison</Label>
                <Input
                  id="season"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="episode">Épisode</Label>
                <Input
                  id="episode"
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetchSeries()} disabled={isLoadingSeries}>
                  {isLoadingSeries ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tester'}
                </Button>
                <Button onClick={testSeriesAPI} variant="outline">
                  Test API Direct
                </Button>
              </div>
            </div>

            {seriesError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Erreur Série:</h4>
                <p className="text-sm text-red-600">{seriesError.message}</p>
              </div>
            )}

            {seriesData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Série</Badge>
                  <span className="text-sm text-muted-foreground">
                    {seriesData.sources.length} sources trouvées
                  </span>
                </div>

                {seriesData.sources.length > 0 ? (
                  <div className="grid gap-3">
                    {seriesData.sources.map((source, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{source.quality}</Badge>
                            <Badge variant="outline">{source.language}</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(source.m3u8)}
                          >
                            {copiedUrl === source.m3u8 ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><strong>URL:</strong> 
                            <a 
                              href={source.src} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-1 text-blue-600 hover:underline"
                            >
                              {source.src.substring(0, 50)}...
                            </a>
                          </p>
                          <p><strong>M3U8:</strong> 
                            <a 
                              href={source.m3u8} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="ml-1 text-green-600 hover:underline"
                            >
                              {source.m3u8.substring(0, 50)}...
                            </a>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-600">
                      Aucune source disponible pour cette série/épisode.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw Data */}
          <details className="mt-6">
            <summary className="cursor-pointer font-medium text-sm">Données brutes</summary>
            <div className="mt-2 space-y-4">
              {movieData && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Données Film:</h4>
                  <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(movieData, null, 2)}
                  </pre>
                </div>
              )}
              {seriesData && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Données Série:</h4>
                  <pre className="p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(seriesData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
