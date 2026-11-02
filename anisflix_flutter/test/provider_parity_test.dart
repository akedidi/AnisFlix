import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/direct_extractors.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Library library;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    library.apiKey = 'fixture';
  });

  test(
    'all 14 TV provider families return their links for an anime episode',
    () async {
      final requested = <String>{};
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          if (r.url.host == 'vixsrc.to') {
            return http.Response('unavailable', 503);
          }
          if (r.url.host == 'api.themoviedb.org') {
            return http.Response(
              '{"name":"English Anime","genres":[{"id":16}]}',
              200,
            );
          }
          final q = r.url.queryParameters;
          final path = q['path']!;
          final provider = q['provider'] ?? path;
          requested.add(provider);
          Map<String, dynamic> row(String id) => {
            'url': 'https://example.com/$id.m3u8',
            'provider': id,
            'language': 'VOSTFR',
            'quality': '720p',
            'type': 'hls',
          };
          dynamic data;
          if (path.startsWith('anime/search/')) {
            data = [
              {
                'name': 'Anime',
                'seasons': [
                  {
                    'index': 2,
                    'episodes': [
                      {
                        'index': 3,
                        'streaming_links': [
                          {
                            'language': 'VF',
                            'players': ['https://vidmoly.net/embed-anime.html'],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ];
          } else if (path.startsWith('fstream/')) {
            data = {
              'episodes': {
                '3': {
                  'languages': {
                    'VF': [row('fstream')],
                  },
                },
              },
            };
          } else {
            if (path == 'anime-api') expect(q['title'], 'English Anime');
            data = {
              path == 'yflix' || path == 'anime-api' ? 'results' : 'streams': [
                row(provider),
              ],
            };
          }
          return http.Response(jsonEncode(data), 200);
        }),
      );
      final sources = await api.sources(
        const MediaItem(id: 42, type: 'tv', title: 'Anime', genreIds: [16]),
        season: 2,
        episode: 3,
      );
      expect(requested, {
        'vixsrc',
        'moviebox',
        'vaplayer',
        'yflix',
        'afterdark',
        'fstream/tv/42/season/2',
        'frenchstream',
        'streamzo',
        'animesama',
        'frenchanime',
        'animepahe',
        'hianime',
        'anime-api',
        'anime/search/Anime',
      });
      expect(sources.length, 14);
      expect(
        sources.map((s) => s.provider),
        containsAll(['moviebox', 'vaplayer', 'anime-api', 'vidmoly']),
      );
      api.close();
    },
  );

  test('animation found in detail metadata enables anime paths after search/history', () async {
    final requested = <String>[];
    final api = CatalogApi(
      library,
      client: MockClient((r) async {
        if (r.url.host == 'api.themoviedb.org') {
          return http.Response(
            '{"title":"English Movie","genres":[{"id":16}]}',
            200,
          );
        }
        if (r.url.host == 'vixsrc.to') return http.Response('unavailable', 503);
        requested.add(
          r.url.queryParameters['provider'] ?? r.url.queryParameters['path']!,
        );
        return http.Response('{"streams":[]}', 200);
      }),
    );
    await api.sources(
      const MediaItem(id: 1, type: 'movie', title: 'Animation'),
    );
    expect(
      requested,
      containsAll([
        'anime-api',
        'animepahe',
        'hianime',
        'animesama',
        'frenchanime',
      ]),
    );
    expect(requested, contains('fstream/movie/1'));
    api.close();
  });

  test('Movix Anime matches AOT Japanese title and maps season 4 part 2', () {
    final rows = CatalogApi.parseMovixAnime(
      [
        {
          'name': 'Shingeki no Kyojin',
          'seasons': [
            {
              'name': 'Saison 4 partie 1',
              'episodes': [
                {
                  'index': 1,
                  'streaming_links': [
                    {
                      'players': ['https://vidmoly.net/wrong'],
                    },
                  ],
                },
              ],
            },
            {
              'name': 'Saison 4 partie 2',
              'episodes': [
                {
                  'index': 1,
                  'streaming_links': [
                    {
                      'language': 'VOSTFR',
                      'players': ['https://vidmoly.net/correct'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      const MediaItem(id: 1429, type: 'tv', title: 'L’Attaque des Titans'),
      4,
      17,
    );
    expect(rows.single['url'], 'https://vidmoly.net/correct');
  });

  test('Movix keeps every current host and handles unsplit season 4', () {
    final rows = CatalogApi.parseMovixAnime(
      [
        {
          'name': 'Shingeki no Kyojin',
          'seasons': [
            {
              'name': 'Saison 4',
              'episodes': [
                {
                  'index': 17,
                  'streaming_links': [
                    {
                      'language': 'VOSTFR',
                      'players': [
                        'https://ansembed.net/e/test',
                        'https://uqload.vc/test',
                        'https://new-host.example/test',
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      const MediaItem(id: 1429, type: 'tv', title: 'L’Attaque des Titans'),
      4,
      17,
    );
    expect(rows.length, 3);
    expect(rows.map((r) => r['provider']), [
      'ansembed',
      'uqload',
      'new-host.example',
    ]);
    expect(rows.every((r) => r['type'] == 'embed'), isTrue);
  });

  test(
    'stream parsing preserves external subtitles, headers and decoded URL',
    () {
      final source = StreamSource.parse({
        'decoded_url': 'https://example.com/a.mp4',
        'format': 'mp4',
        'headers': {'Referer': 'https://example.com/'},
        'tracks': [
          {
            'file': 'https://example.com/fr.vtt',
            'label': 'Français',
            'kind': 'captions',
            'srclang': 'fr',
          },
          {'file': 'https://example.com/thumbs.vtt', 'kind': 'thumbnails'},
        ],
      }, 'moviebox')!;
      expect(source.format, 'mp4');
      expect(source.headers['Referer'], 'https://example.com/');
      expect(source.subtitles.single.language, 'fr');
    },
  );

  test('Vidzy XOR decoder handles browser calibration and ignores decoy', () {
    const url = 'https://cdn.example.com/video.m3u8?token=fixture';
    const host = 'vidzy.org';
    final hash = host.codeUnits.fold(0, (a, b) => (a + b) & 255);
    const calibration = 101;
    final bytes = List.generate(
      url.length,
      (i) => url.codeUnitAt(i) ^ ((0x3d + i * 89 + hash + calibration) & 255),
    );
    final payload = base64Encode(bytes.reversed.toList());
    final html =
        "(function(s){var x=atob(s);var h=x.charCodeAt(0);var BC='calc(1in + 5px)';var y=h+BC;})('$payload')";
    expect(DirectExtractors.decodeVidzy(html, host), url);
    expect(
      DirectExtractors.quotedMedia("file:'https://example.com/troll/fake.mp4'"),
      isNull,
    );
  });

  test('VixSrc quality links come from actual master variants', () {
    final variants = DirectExtractors.vixsrcVariants(
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000,RESOLUTION=1920x1080\n1080.m3u8?token=fixture\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1280x720\nhttps://cdn.example.com/720.m3u8\n',
      Uri.parse('https://vixsrc.to/playlist/master'),
      {'Referer': 'https://vixsrc.to/'},
    );
    expect(variants.map((s) => s.quality), ['1080p', '720p']);
    expect(
      variants.first.url,
      'https://vixsrc.to/playlist/1080.m3u8?token=fixture',
    );
    expect(variants.first.headers['Referer'], 'https://vixsrc.to/');
  });

  test('VixSrc retains signed master parameters and rejects expired tokens', () {
    final expires = DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600;
    final html =
        "window.masterPlaylist = {params:{'token':'fixture','expires':'$expires'},url:'https://vixsrc.to/playlist/test?b=1'};";
    final master = DirectExtractors.vixsrcMaster(html)!;
    expect(master.queryParameters, containsPair('token', 'fixture'));
    expect(master.queryParameters, containsPair('b', '1'));
    expect(
      DirectExtractors.vixsrcMaster(html.replaceAll('$expires', '1')),
      isNull,
    );
  });
}
