import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NetflixMoviesMinimal() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Appel direct à l'API TMDB
        const response = await fetch(
          'https://api.themoviedb.org/3/discover/movie?api_key=f3d757824f08ea2cff45eb8f47ca3a1e&with_watch_providers=8&watch_region=FR&with_watch_monetization_types=flatrate&vote_average_gte=5&page=1'
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        console.log('✅ Données reçues:', result);
      } catch (err) {
        console.error('❌ Erreur:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-semibold">Netflix Movies (Minimal)</h1>
        </div>
        
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
            <strong>Status:</strong> {loading ? 'Chargement...' : error ? 'Erreur' : 'Succès'}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Erreur:</strong> {error}
            </div>
          )}

          {/* Success */}
          {data && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Succès!</strong> {data.results?.length || 0} films trouvés
              <br />
              <strong>Total pages:</strong> {data.total_pages}
              <br />
              <strong>Page actuelle:</strong> {data.page}
            </div>
          )}

          {/* Movies List */}
          {data && data.results && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Films Netflix:</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.results.slice(0, 12).map((movie: any) => (
                  <div key={movie.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <img
                      src={movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : '/placeholder-movie.jpg'}
                      alt={movie.title}
                      className="w-full h-64 object-cover"
                    />
                    <div className="p-3">
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{movie.title}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        ⭐ {Math.round(movie.vote_average * 10) / 10}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
            <strong>Debug Info:</strong>
            <pre className="mt-2 text-xs overflow-auto max-h-40">
              {JSON.stringify({
                loading,
                error,
                dataLength: data?.results?.length,
                totalPages: data?.total_pages,
                page: data?.page
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
