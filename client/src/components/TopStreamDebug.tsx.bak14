import React from 'react';
import { useTopStream } from '@/hooks/useTopStream';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';

interface TopStreamDebugProps {
  type: 'movie' | 'tv';
  id: number;
  title: string;
}

export default function TopStreamDebug({ type, id, title }: TopStreamDebugProps) {
  const { data: topStreamData, isLoading, error, refetch } = useTopStream(type, id);

  const testTopStreamAPI = async () => {
    try {
      const response = await fetch(`https://api.movix.site/api/topstream/${type}/${id}`);
      const data = await response.json();
      
      console.log('TopStream API Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      return data;
    } catch (error) {
      console.error('TopStream API Error:', error);
      return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5" />
          TopStream Debug
        </CardTitle>
        <CardDescription>
          Debug des données TopStream pour {title} (ID: {id}, Type: {type})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {error && <AlertCircle className="w-4 h-4 text-red-500" />}
          {topStreamData && <CheckCircle className="w-4 h-4 text-green-500" />}
          {!isLoading && !error && !topStreamData && <AlertCircle className="w-4 h-4 text-yellow-500" />}
          
          <span className="font-medium">
            {isLoading ? 'Chargement...' : 
             error ? 'Erreur' : 
             topStreamData ? 'Données disponibles' : 
             'Aucune donnée'}
          </span>
        </div>

        {/* Test API Button */}
        <Button 
          onClick={testTopStreamAPI}
          variant="outline"
          size="sm"
        >
          Tester l'API TopStream
        </Button>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Erreur:</h4>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}

        {/* Data Display */}
        {topStreamData && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={topStreamData.success ? "default" : "destructive"}>
                {topStreamData.success ? 'Succès' : 'Échec'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                TMDB ID: {topStreamData.tmdb_id}
              </span>
            </div>

            {topStreamData.tmdb_details && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Détails TMDB:</h4>
                <div className="text-sm text-blue-600 space-y-1">
                  <p><strong>Titre:</strong> {topStreamData.tmdb_details.title}</p>
                  <p><strong>Année:</strong> {topStreamData.tmdb_details.year}</p>
                  <p><strong>Date de sortie:</strong> {topStreamData.tmdb_details.release_date}</p>
                </div>
              </div>
            )}

            {topStreamData.topstream_match && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Correspondance TopStream:</h4>
                <div className="text-sm text-green-600 space-y-1">
                  <p><strong>Titre:</strong> {topStreamData.topstream_match.title}</p>
                  <p><strong>Année:</strong> {topStreamData.topstream_match.year}</p>
                  <p><strong>Similarité:</strong> {topStreamData.topstream_match.similarity}%</p>
                  <p><strong>Score total:</strong> {topStreamData.topstream_match.total_score}</p>
                </div>
              </div>
            )}

            {topStreamData.stream && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">Stream disponible:</h4>
                <div className="text-sm text-purple-600 space-y-1">
                  <p><strong>Type:</strong> {topStreamData.stream.type}</p>
                  <p><strong>Label:</strong> {topStreamData.stream.label}</p>
                  <p><strong>URL:</strong> 
                    <a 
                      href={topStreamData.stream.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 text-blue-600 hover:underline"
                    >
                      {topStreamData.stream.url.substring(0, 50)}...
                    </a>
                  </p>
                </div>
              </div>
            )}

            {topStreamData.searched_titles && topStreamData.searched_titles.length > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Titres recherchés:</h4>
                <div className="text-sm text-gray-600">
                  {topStreamData.searched_titles.map((title, index) => (
                    <span key={index} className="inline-block bg-gray-200 px-2 py-1 rounded mr-2 mb-1">
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Data Message */}
        {!isLoading && !error && !topStreamData && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Aucune donnée disponible</h4>
            <p className="text-sm text-yellow-600">
              TopStream n'a pas trouvé de correspondance pour ce contenu. 
              Cela peut être dû à :
            </p>
            <ul className="text-sm text-yellow-600 mt-2 ml-4 list-disc">
              <li>Le contenu n'est pas disponible sur TopStream</li>
              <li>Le titre ne correspond pas exactement</li>
              <li>L'API TopStream est temporairement indisponible</li>
            </ul>
          </div>
        )}

        {/* Raw Data */}
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-sm">Données brutes</summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(topStreamData, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
