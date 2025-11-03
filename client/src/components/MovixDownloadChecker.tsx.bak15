import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface MovieTest {
  id: number;
  title: string;
  hasSources: boolean;
  sourcesCount: number;
  error?: string;
}

export default function MovixDownloadChecker() {
  const [movieId, setMovieId] = useState('575265');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MovieTest[]>([]);

  const testMovie = async (id: number): Promise<MovieTest> => {
    try {
      const response = await fetch(`https://api.movix.site/api/films/download/${id}`);
      const data = await response.json();
      
      if (data.error) {
        return {
          id,
          title: `Film ${id}`,
          hasSources: false,
          sourcesCount: 0,
          error: data.error
        };
      }
      
      return {
        id,
        title: `Film ${id}`,
        hasSources: data.sources && data.sources.length > 0,
        sourcesCount: data.sources?.length || 0
      };
    } catch (error) {
      return {
        id,
        title: `Film ${id}`,
        hasSources: false,
        sourcesCount: 0,
        error: 'Erreur réseau'
      };
    }
  };

  const testSingleMovie = async () => {
    setIsLoading(true);
    const result = await testMovie(parseInt(movieId));
    setResults([result]);
    setIsLoading(false);
  };

  const testMultipleMovies = async () => {
    setIsLoading(true);
    const testIds = [575265, 164177, 550, 13, 155, 238, 389, 496243, 19404, 278];
    const results = await Promise.all(testIds.map(id => testMovie(id)));
    setResults(results);
    setIsLoading(false);
  };

  const getStatusIcon = (result: MovieTest) => {
    if (result.error) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (result.hasSources) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusBadge = (result: MovieTest) => {
    if (result.error) {
      return <Badge variant="destructive">Erreur</Badge>;
    }
    if (result.hasSources) {
      return <Badge variant="default">{result.sourcesCount} sources</Badge>;
    }
    return <Badge variant="secondary">Aucune source</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Vérificateur MovixDownload
          </CardTitle>
          <CardDescription>
            Vérifiez quels films ont des sources disponibles sur l'API MovixDownload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test d'un film spécifique */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test d'un film spécifique</h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="movieId">ID Film TMDB</Label>
                <Input
                  id="movieId"
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  placeholder="575265"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={testSingleMovie} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tester'}
                </Button>
              </div>
            </div>
          </div>

          {/* Test de plusieurs films */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test de plusieurs films populaires</h3>
            <Button onClick={testMultipleMovies} disabled={isLoading} variant="outline">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Tester 10 films populaires
            </Button>
          </div>

          {/* Résultats */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Résultats</h3>
              <div className="grid gap-3">
                {results.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result)}
                      <div>
                        <p className="font-medium">{result.title}</p>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(result)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/movie/${result.id}`, '_blank')}
                      >
                        Voir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistiques */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Statistiques</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total testés</p>
                    <p className="font-semibold">{results.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avec sources</p>
                    <p className="font-semibold text-green-600">
                      {results.filter(r => r.hasSources).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sans sources</p>
                    <p className="font-semibold text-red-600">
                      {results.filter(r => !r.hasSources).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommandations */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">💡 Recommandations</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Testez avec des films populaires récents (ID 164177 fonctionne)</li>
              <li>• Les films plus anciens ont moins de chances d'avoir des sources</li>
              <li>• L'API MovixDownload ne couvre pas tous les films</li>
              <li>• Utilisez FStream et TopStream comme sources alternatives</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
