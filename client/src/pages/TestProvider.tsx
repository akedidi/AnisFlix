import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMoviesByProvider } from "@/hooks/useTMDB";

export default function TestProvider() {
  const [providerId, setProviderId] = useState(8); // Netflix par défaut
  
  // Test avec différents providers
  const { data: moviesData, isLoading, error } = useMoviesByProvider(providerId, 1);
  
  const providers = [
    { id: 8, name: "Netflix" },
    { id: 9, name: "Amazon Prime" },
    { id: 337, name: "Disney+" },
    { id: 1899, name: "HBO Max" },
    { id: 350, name: "Apple TV+" },
    { id: 531, name: "Paramount+" }
  ];

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
          <h1 className="text-2xl font-semibold">Test Provider API</h1>
        </div>
        
        {/* Provider Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Sélectionner un provider :</h2>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                variant={providerId === provider.id ? "default" : "outline"}
                onClick={() => setProviderId(provider.id)}
              >
                {provider.name} (ID: {provider.id})
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Résultats pour {providers.find(p => p.id === providerId)?.name} :</h2>
          
          {isLoading && (
            <p className="text-blue-500">Chargement...</p>
          )}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Erreur:</strong> {error.message || 'Erreur inconnue'}
            </div>
          )}
          
          {moviesData && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <strong>Succès!</strong> {moviesData.results?.length || 0} films trouvés
              <br />
              <strong>Total pages:</strong> {moviesData.total_pages}
              <br />
              <strong>Page actuelle:</strong> {moviesData.page}
            </div>
          )}
          
          {/* Debug Info */}
          <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
            <strong>Debug Info:</strong>
            <pre className="mt-2 text-sm">
              {JSON.stringify({
                providerId,
                isLoading,
                error: error?.message,
                dataLength: moviesData?.results?.length,
                totalPages: moviesData?.total_pages
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
