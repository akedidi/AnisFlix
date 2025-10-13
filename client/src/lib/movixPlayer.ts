// Movix API integration for player links

export interface PlayerLink {
  player: string;
  link: string;
  is_hd: boolean;
}

export interface MovixResponse {
  player_links?: PlayerLink[];
  type?: string;
  series?: any[];
}

/**
 * Récupère les liens de lecture depuis l'API Movix
 * @param imdbId - L'ID IMDB (ex: tt13186306)
 * @param mediaType - 'movie' ou 'tv'
 * @returns Promise<MovixResponse>
 */
export async function getMovixPlayerLinks(imdbId: string, mediaType: 'movie' | 'tv'): Promise<MovixResponse> {
  try {
    const endpoint = mediaType === 'movie' 
      ? `https://api.movix.site/api/imdb/movie/${imdbId}`
      : `https://api.movix.site/api/imdb/tv/${imdbId}`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Movix API error: ${response.status}`);
    }
    
    const data: MovixResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Movix player links:', error);
    throw error;
  }
}

/**
 * Récupère les liens SuperVideo spécifiquement depuis l'API Movix
 * @param imdbId - L'ID IMDB (ex: tt13186306)
 * @param mediaType - 'movie' ou 'tv'
 * @returns Promise<PlayerLink[]> - Liste des liens SuperVideo
 */
export async function getSuperVideoLinks(imdbId: string, mediaType: 'movie' | 'tv'): Promise<PlayerLink[]> {
  try {
    const movixData = await getMovixPlayerLinks(imdbId, mediaType);
    
    // Filtrer uniquement les liens SuperVideo
    const superVideoLinks = movixData.player_links?.filter(link => 
      link.player === 'supervideo'
    ) || [];
    
    return superVideoLinks;
  } catch (error) {
    console.error('Error fetching SuperVideo links:', error);
    throw error;
  }
}

/**
 * Extrait l'ID IMDB depuis une URL ou un ID IMDB
 * @param imdbId - L'ID IMDB ou l'URL complète
 * @returns L'ID IMDB nettoyé (ex: tt13186306)
 */
export function extractImdbId(imdbId: string): string | null {
  if (!imdbId) return null;
  
  // Si c'est déjà un ID IMDB (commence par tt)
  if (imdbId.startsWith('tt')) {
    return imdbId;
  }
  
  // Si c'est une URL IMDB, extraire l'ID
  const match = imdbId.match(/\/title\/(tt\d+)/);
  if (match) {
    return match[1];
  }
  
  return null;
}

/**
 * Extrait le lien m3u8 depuis une URL SuperVideo
 * @param superVideoUrl - L'URL SuperVideo (ex: https://supervideo.cc/e/4sro2m95gamx)
 * @returns Promise<string> - Le lien m3u8 extrait
 */
export async function extractSuperVideoM3u8(superVideoUrl: string): Promise<string> {
  // Try external extraction first (uses mock for testing when all methods fail)
  try {
    const externalResponse = await fetch('/api/supervideo-extract-external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: superVideoUrl }),
    });

    if (!externalResponse.ok) {
      throw new Error(`SuperVideo external extraction failed: ${externalResponse.status}`);
    }

    const externalData = await externalResponse.json();
    
    if (externalData.success && externalData.m3u8) {
      console.log('External extraction successful');
      return externalData.m3u8;
    } else {
      throw new Error(externalData.error || 'Failed to extract m3u8 from SuperVideo with external method');
    }
  } catch (externalError) {
    console.error('Error with external SuperVideo extraction, trying alternative method:', externalError);
    
    // Try alternative extraction as fallback
    try {
      const alternativeResponse = await fetch('/api/supervideo-extract-alternative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: superVideoUrl }),
      });

      if (!alternativeResponse.ok) {
        throw new Error(`SuperVideo alternative extraction failed: ${alternativeResponse.status}`);
      }

      const alternativeData = await alternativeResponse.json();
      
      if (alternativeData.success && alternativeData.m3u8) {
        console.log('Alternative extraction successful');
        return alternativeData.m3u8;
      } else {
        throw new Error(alternativeData.error || 'Failed to extract m3u8 from SuperVideo with alternative method');
      }
    } catch (alternativeError) {
      console.error('Error with alternative SuperVideo extraction, trying proxy method:', alternativeError);
      
      // Try proxy extraction as fallback
      try {
        const proxyResponse = await fetch('/api/supervideo-extract-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: superVideoUrl }),
        });

        if (!proxyResponse.ok) {
          throw new Error(`SuperVideo proxy extraction failed: ${proxyResponse.status}`);
        }

        const proxyData = await proxyResponse.json();
        
        if (proxyData.success && proxyData.m3u8) {
          console.log('Proxy extraction successful');
          return proxyData.m3u8;
        } else {
          throw new Error(proxyData.error || 'Failed to extract m3u8 from SuperVideo with proxy method');
        }
      } catch (proxyError) {
        console.error('Error with proxy SuperVideo extraction, trying simple method:', proxyError);
        
        // Try simple extraction as fallback
        try {
          const simpleResponse = await fetch('/api/supervideo-extract-simple', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: superVideoUrl }),
          });

          if (!simpleResponse.ok) {
            throw new Error(`SuperVideo simple extraction failed: ${simpleResponse.status}`);
          }

          const simpleData = await simpleResponse.json();
          
          if (simpleData.success && simpleData.m3u8) {
            console.log('Simple extraction successful');
            return simpleData.m3u8;
          } else {
            throw new Error(simpleData.error || 'Failed to extract m3u8 from SuperVideo with simple method');
          }
        } catch (simpleError) {
          console.error('Error with simple SuperVideo extraction, trying Puppeteer:', simpleError);
          
          // Try Puppeteer-based extraction as fallback
          try {
            const response = await fetch('/api/supervideo-extract', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: superVideoUrl }),
            });

            if (!response.ok) {
              throw new Error(`SuperVideo extraction failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.m3u8) {
              return data.m3u8;
            } else {
              throw new Error(data.error || 'Failed to extract m3u8 from SuperVideo');
            }
          } catch (puppeteerError) {
            console.error('Error with Puppeteer SuperVideo extraction, trying HTML fallback:', puppeteerError);
            
            // Try HTML fallback method as last resort
            try {
              const fallbackResponse = await fetch('/api/supervideo-extract-fallback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: superVideoUrl }),
              });

              if (!fallbackResponse.ok) {
                throw new Error(`SuperVideo fallback extraction failed: ${fallbackResponse.status}`);
              }

              const fallbackData = await fallbackResponse.json();
              
              if (fallbackData.success && fallbackData.m3u8) {
                console.log('HTML fallback extraction successful');
                return fallbackData.m3u8;
              } else {
                throw new Error(fallbackData.error || 'Failed to extract m3u8 from SuperVideo with HTML fallback');
              }
            } catch (fallbackError) {
              console.error('Error with HTML fallback SuperVideo extraction:', fallbackError);
              throw new Error(`All SuperVideo extraction methods failed: ${externalError.message}`);
            }
          }
        }
      }
    }
  }
}

/**
 * Traite un lien master.m3u8 et retourne l'URL de l'index m3u8
 * @param masterM3u8Url - L'URL du master.m3u8
 * @returns Promise<string> - L'URL de l'index m3u8
 */
export async function getIndexM3u8FromMaster(masterM3u8Url: string): Promise<string> {
  try {
    const response = await fetch(`/api/hls-proxy?url=${encodeURIComponent(masterM3u8Url)}&type=master`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch master playlist: ${response.status}`);
    }

    const playlistText = await response.text();
    
    // Parse the master playlist to find the index URL
    const lines = playlistText.split('\n');
    let indexUrl = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for EXT-X-STREAM-INF followed by a URL
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && !nextLine.startsWith('#')) {
          indexUrl = nextLine;
          break;
        }
      }
    }
    
    if (!indexUrl) {
      throw new Error('No index URL found in master playlist');
    }
    
    // If it's a relative URL, make it absolute
    if (!indexUrl.startsWith('http')) {
      const baseUrl = new URL(masterM3u8Url);
      const basePath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/'));
      indexUrl = `${baseUrl.origin}${basePath}/${indexUrl}`;
    }
    
    return indexUrl;
  } catch (error) {
    console.error('Error getting index m3u8 from master:', error);
    throw error;
  }
}

/**
 * Obtient l'URL proxy pour un stream HLS complet
 * @param masterM3u8Url - L'URL du master.m3u8
 * @returns Promise<string> - L'URL proxy pour le lecteur vidéo
 */
export async function getHLSProxyUrl(masterM3u8Url: string): Promise<string> {
  try {
    // Le proxy HLS gère automatiquement le master.m3u8 et réécrit les URLs
    return `/api/hls-proxy?url=${encodeURIComponent(masterM3u8Url)}&type=master`;
  } catch (error) {
    console.error('Error getting HLS proxy URL:', error);
    throw error;
  }
}
