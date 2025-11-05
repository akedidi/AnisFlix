import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Play, ExternalLink, Copy, Check } from 'lucide-react';
import { extractVidSrcStreamingLinks, extractVidSrcM3u8, generateVidSrcMovieUrl } from '@/lib/vidsrc';
import TopStreamDebug from '@/components/TopStreamDebug';

export default function VidSrcTest() {
  const [url, setUrl] = useState('https://vidsrc.io/embed/movie?tmdb=986097');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleExtractLinks = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const linksResult = await extractVidSrcStreamingLinks(url);
      
      if (linksResult.success) {
        setResult(linksResult);
      } else {
        setError(linksResult.error || 'Erreur lors de l\'extraction');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractM3u8 = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const m3u8Url = await extractVidSrcM3u8(url);
      
      if (m3u8Url) {
        setResult({ m3u8Url });
      } else {
        setError('Aucun lien m3u8 trouvé');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(text);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const generateTestUrl = (tmdbId: number) => {
    const testUrl = generateVidSrcMovieUrl(tmdbId);
    setUrl(testUrl);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test VidSrc Scraper</CardTitle>
          <CardDescription>
            Testez l'extraction de liens de streaming depuis VidSrc.io
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL VidSrc</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://vidsrc.io/embed/movie?tmdb=986097"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExtractLinks} disabled={isLoading || !url.trim()}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Extraire les liens
            </Button>
            <Button onClick={handleExtractM3u8} disabled={isLoading || !url.trim()} variant="outline">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Extraire m3u8
            </Button>
          </div>

          <div className="space-y-2">
            <Label>URLs de test rapides</Label>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => generateTestUrl(986097)}>
                Film Test 1
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateTestUrl(550)}>
                Fight Club
              </Button>
              <Button size="sm" variant="outline" onClick={() => generateTestUrl(155)}>
                The Dark Knight
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600 font-medium">Erreur</div>
            <div className="text-red-500 text-sm mt-1">{error}</div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          {result.m3u8Url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Lien m3u8 trouvé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                  <code className="flex-1 text-sm break-all">{result.m3u8Url}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(result.m3u8Url)}
                  >
                    {copiedUrl === result.m3u8Url ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-2">
                  <Button
                    onClick={() => window.open(result.m3u8Url, '_blank')}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Ouvrir dans le lecteur
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {result.players && result.players.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lecteurs disponibles ({result.players.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.players.map((player: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={player.type === 'm3u8' ? 'default' : 'secondary'}>
                          {player.type}
                        </Badge>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(player.url)}
                        >
                          {copiedUrl === player.url ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.open(player.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• VidSrc.io fournit des liens de streaming pour films et séries</p>
          <p>• Le scraper extrait les liens m3u8 et les lecteurs disponibles</p>
          <p>• Les liens peuvent être utilisés directement dans votre lecteur vidéo</p>
          <p>• Format d'URL: <code>https://vidsrc.io/embed/movie?tmdb=ID</code></p>
        </CardContent>
      </Card>
    </div>
  );
}
