/**
 * Test de la distinction des sources VIDZY avec vidzy1, vidzy2, etc.
 * Ce fichier simule les données FStream pour tester la logique de distinction
 */

export interface TestPlayer {
  player: string;
  url: string;
  quality: string;
}

export interface TestFStreamData {
  players: {
    [key: string]: TestPlayer[];
  };
  episodes?: {
    [episode: string]: {
      languages: {
        [key: string]: TestPlayer[];
      };
    };
  };
}

// Données de test simulées
export const testFStreamData: TestFStreamData = {
  players: {
    VFF: [
      {
        player: 'VIDZY',
        url: 'https://vidzy.org/embed/vff-source-1',
        quality: '1080p'
      },
      {
        player: 'VIDZY',
        url: 'https://vidzy.org/embed/vff-source-2',
        quality: '720p'
      }
    ],
    VFQ: [
      {
        player: 'VIDZY',
        url: 'https://vidzy.org/embed/vfq-source-1',
        quality: '1080p'
      }
    ],
    Default: [
      {
        player: 'VIDZY',
        url: 'https://vidzy.org/embed/default-source-1',
        quality: '720p'
      },
      {
        player: 'VIDZY',
        url: 'https://vidzy.org/embed/default-source-2',
        quality: '480p'
      }
    ],
    VOSTFR: [
      {
        player: 'VIDZY',
        url: 'https://vidzy.org/embed/vostfr-source-1',
        quality: '1080p'
      }
    ]
  },
  episodes: {
    '1': {
      languages: {
        VFF: [
          {
            player: 'VIDZY',
            url: 'https://vidzy.org/embed/episode1-vff-source',
            quality: '1080p'
          }
        ],
        Default: [
          {
            player: 'VIDZY',
            url: 'https://vidzy.org/embed/episode1-default-source',
            quality: '720p'
          }
        ]
      }
    }
  }
};

/**
 * Fonction de test pour simuler la logique de distinction des sources VIDZY
 */
export function testVidzyDistinction(fStreamData: TestFStreamData, selectedLanguage: 'VF' | 'VOSTFR' = 'VF') {
  const allSources: any[] = [];
  let vidzyCounter = 1;

  if (fStreamData.players) {
    if (selectedLanguage === 'VF') {
      // Traiter les clés VF (VFF, VFQ, etc.) en premier
      const vfKeys = Object.keys(fStreamData.players).filter(key => 
        key.startsWith('VF') || key === 'VF'
      );

      vfKeys.forEach(key => {
        if (fStreamData.players![key]) {
          const vidzyPlayers = fStreamData.players![key].filter((player: TestPlayer) => 
            player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
          );

          vidzyPlayers.forEach((player: TestPlayer) => {
            allSources.push({
              id: `fstream-vidzy-${key.toLowerCase()}-${vidzyCounter}`,
              name: `Vidzy${vidzyCounter} (${key}) - ${player.quality}`,
              provider: 'fstream',
              url: player.url,
              type: 'm3u8' as const,
              player: player.player,
              isFStream: true,
              sourceKey: key
            });
            vidzyCounter++;
          });
        }
      });

      // Traiter les sources Default séparément
      if (fStreamData.players.Default) {
        const defaultVidzyPlayers = fStreamData.players.Default.filter((player: TestPlayer) => 
          player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
        );

        defaultVidzyPlayers.forEach((player: TestPlayer) => {
          allSources.push({
            id: `fstream-vidzy-default-${vidzyCounter}`,
            name: `Vidzy${vidzyCounter} (Default) - ${player.quality}`,
            provider: 'fstream',
            url: player.url,
            type: 'm3u8' as const,
            player: player.player,
            isFStream: true,
            sourceKey: 'Default'
          });
          vidzyCounter++;
        });
      }
    } else {
      // Pour VOSTFR
      const vostfrPlayers = fStreamData.players.VOSTFR || [];
      const vostfrVidzyPlayers = vostfrPlayers.filter((player: TestPlayer) => 
        player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
      );

      vostfrVidzyPlayers.forEach((player: TestPlayer) => {
        allSources.push({
          id: `fstream-vidzy-vostfr-${vidzyCounter}`,
          name: `Vidzy${vidzyCounter} (VOSTFR) - ${player.quality}`,
          provider: 'fstream',
          url: player.url,
          type: 'm3u8' as const,
          player: player.player,
          isFStream: true,
          sourceKey: 'VOSTFR'
        });
        vidzyCounter++;
      });
    }
  }

  return allSources;
}

/**
 * Fonction pour tester la distinction des sources d'épisodes
 */
export function testEpisodeVidzyDistinction(fStreamData: TestFStreamData, episode: number, selectedLanguage: 'VF' | 'VOSTFR' = 'VF') {
  const allSources: any[] = [];
  let episodeVidzyCounter = 1;

  if (fStreamData.episodes && fStreamData.episodes[episode.toString()]) {
    const episodeData = fStreamData.episodes[episode.toString()];
    
    if (selectedLanguage === 'VF') {
      const vfKeys = Object.keys(episodeData.languages).filter(key => 
        key.startsWith('VF') || key === 'VF'
      );

      vfKeys.forEach(key => {
        if (episodeData.languages![key]) {
          const vidzyPlayers = episodeData.languages![key].filter((player: TestPlayer) => 
            player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
          );

          vidzyPlayers.forEach((player: TestPlayer) => {
            allSources.push({
              id: `fstream-episode-vidzy-${key.toLowerCase()}-${episodeVidzyCounter}`,
              name: `Vidzy${episodeVidzyCounter} (${key}) - ${player.quality}`,
              provider: 'fstream',
              url: player.url,
              type: 'm3u8' as const,
              player: player.player,
              isFStream: true,
              sourceKey: key,
              isEpisode: true
            });
            episodeVidzyCounter++;
          });
        }
      });

      if (episodeData.languages.Default) {
        const defaultVidzyPlayers = episodeData.languages.Default.filter((player: TestPlayer) => 
          player.player === 'VIDZY' || player.player === 'ViDZY' || player.player === 'vidzy'
        );

        defaultVidzyPlayers.forEach((player: TestPlayer) => {
          allSources.push({
            id: `fstream-episode-vidzy-default-${episodeVidzyCounter}`,
            name: `Vidzy${episodeVidzyCounter} (Default) - ${player.quality}`,
            provider: 'fstream',
            url: player.url,
            type: 'm3u8' as const,
            player: player.player,
            isFStream: true,
            sourceKey: 'Default',
            isEpisode: true
          });
          episodeVidzyCounter++;
        });
      }
    }
  }

  return allSources;
}

/**
 * Fonction pour exécuter tous les tests
 */
export function runVidzyDistinctionTests() {
  console.log('🧪 Test de distinction des sources VIDZY\n');

  // Test 1: Sources VF
  console.log('📺 Test 1: Sources VF');
  const vfSources = testVidzyDistinction(testFStreamData, 'VF');
  console.log('Sources VF trouvées:', vfSources.length);
  vfSources.forEach(source => {
    console.log(`  - ${source.name} (${source.sourceKey})`);
  });

  // Test 2: Sources VOSTFR
  console.log('\n📺 Test 2: Sources VOSTFR');
  const vostfrSources = testVidzyDistinction(testFStreamData, 'VOSTFR');
  console.log('Sources VOSTFR trouvées:', vostfrSources.length);
  vostfrSources.forEach(source => {
    console.log(`  - ${source.name} (${source.sourceKey})`);
  });

  // Test 3: Sources d'épisodes
  console.log('\n📺 Test 3: Sources d\'épisodes');
  const episodeSources = testEpisodeVidzyDistinction(testFStreamData, 1, 'VF');
  console.log('Sources d\'épisodes trouvées:', episodeSources.length);
  episodeSources.forEach(source => {
    console.log(`  - ${source.name} (${source.sourceKey})`);
  });

  console.log('\n✅ Tests terminés !');
  
  return {
    vfSources,
    vostfrSources,
    episodeSources
  };
}

// Exécuter les tests si ce fichier est importé directement
if (typeof window !== 'undefined') {
  // Dans le navigateur, on peut exécuter les tests
  (window as any).runVidzyDistinctionTests = runVidzyDistinctionTests;
}
