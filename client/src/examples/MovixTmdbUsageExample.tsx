import React from 'react';
import { useMovixTmdbSources } from '@/hooks/useMovixTmdbSources';

/**
 * Exemple d'utilisation du hook useMovixTmdbSources
 * 
 * Ce hook récupère les sources Movix TMDB et analyse automatiquement
 * les player_links pour identifier les providers (vidmoly, vidzy, darki)
 * en fonction du contenu de la clé "quality".
 */
export default function MovixTmdbUsageExample() {
  const movieId = 1280450; // Exemple avec un ID de film
  
  const { 
    data: movixData, 
    isLoading, 
    error 
  } = useMovixTmdbSources(movieId);

  if (isLoading) {
    return <div>Chargement des sources Movix TMDB...</div>;
  }

  if (error) {
    return <div>Erreur: {error.message}</div>;
  }

  if (!movixData) {
    return <div>Aucune donnée disponible</div>;
  }

  const { 
    tmdb_details, 
    iframe_src, 
    player_links, 
    processedSources, 
    sourcesByProvider 
  } = movixData;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Exemple d'utilisation Movix TMDB</h2>
      
      {/* Informations du film */}
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="text-lg font-semibold">Informations du film</h3>
        <p><strong>Titre:</strong> {tmdb_details.title}</p>
        <p><strong>Date de sortie:</strong> {tmdb_details.release_date}</p>
        <p><strong>Note:</strong> {tmdb_details.vote_average}/10</p>
      </div>

      {/* Sources brutes (player_links) */}
      <div className="bg-blue-100 p-4 rounded">
        <h3 className="text-lg font-semibold">Sources brutes (player_links)</h3>
        <p><strong>Nombre total:</strong> {player_links.length}</p>
        <div className="mt-2 space-y-2">
          {player_links.map((link, index) => (
            <div key={index} className="bg-white p-2 rounded text-sm">
              <p><strong>URL:</strong> {link.decoded_url}</p>
              <p><strong>Qualité:</strong> {link.quality}</p>
              <p><strong>Langue:</strong> {link.language}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sources traitées et filtrées */}
      <div className="bg-green-100 p-4 rounded">
        <h3 className="text-lg font-semibold">Sources traitées (filtrées par provider)</h3>
        <p><strong>Nombre filtré:</strong> {processedSources.length}</p>
        <div className="mt-2 space-y-2">
          {processedSources.map((source, index) => (
            <div key={index} className="bg-white p-2 rounded text-sm">
              <p><strong>Provider:</strong> {source.provider}</p>
              <p><strong>URL:</strong> {source.url}</p>
              <p><strong>Qualité originale:</strong> {source.originalQuality}</p>
              <p><strong>Langue:</strong> {source.language}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sources groupées par provider */}
      <div className="bg-yellow-100 p-4 rounded">
        <h3 className="text-lg font-semibold">Sources par provider</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* VidMoly */}
          <div className="bg-white p-3 rounded">
            <h4 className="font-semibold text-red-600">VidMoly ({sourcesByProvider.vidmoly.length})</h4>
            {sourcesByProvider.vidmoly.map((source, index) => (
              <div key={index} className="text-sm mt-1 p-1 bg-red-50 rounded">
                <p><strong>URL:</strong> {source.url}</p>
                <p><strong>Qualité:</strong> {source.quality}</p>
              </div>
            ))}
          </div>

          {/* VidZy */}
          <div className="bg-white p-3 rounded">
            <h4 className="font-semibold text-blue-600">VidZy ({sourcesByProvider.vidzy.length})</h4>
            {sourcesByProvider.vidzy.map((source, index) => (
              <div key={index} className="text-sm mt-1 p-1 bg-blue-50 rounded">
                <p><strong>URL:</strong> {source.url}</p>
                <p><strong>Qualité:</strong> {source.quality}</p>
              </div>
            ))}
          </div>

          {/* Darki */}
          <div className="bg-white p-3 rounded">
            <h4 className="font-semibold text-purple-600">Darki ({sourcesByProvider.darki.length})</h4>
            {sourcesByProvider.darki.map((source, index) => (
              <div key={index} className="text-sm mt-1 p-1 bg-purple-50 rounded">
                <p><strong>URL:</strong> {source.url}</p>
                <p><strong>Qualité:</strong> {source.quality}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exemple d'utilisation pratique */}
      <div className="bg-gray-100 p-4 rounded">
        <h3 className="text-lg font-semibold">Exemple d'utilisation pratique</h3>
        <pre className="bg-gray-800 text-white p-3 rounded text-sm overflow-x-auto">
{`// Utilisation dans un composant
const { data: movixData } = useMovixTmdbSources(movieId);

// Accéder aux sources par provider
const vidmolySources = movixData?.sourcesByProvider.vidmoly || [];
const vidzySources = movixData?.sourcesByProvider.vidzy || [];
const darkiSources = movixData?.sourcesByProvider.darki || [];

// Utiliser les sources pour le player
vidmolySources.forEach(source => {
  console.log('Source VidMoly:', source.url);
  // Traiter l'URL VidMoly...
});

vidzySources.forEach(source => {
  console.log('Source VidZy:', source.url);
  // Traiter l'URL VidZy...
});

darkiSources.forEach(source => {
  console.log('Source Darki:', source.url);
  // Traiter l'URL Darki...
});`}
        </pre>
      </div>
    </div>
  );
}
