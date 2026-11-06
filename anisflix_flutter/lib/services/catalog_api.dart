import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/media.dart';
import 'library.dart';
import 'direct_extractors.dart';
import 'native_sources.dart';
import 'provider_catalog_policy.dart';

class ApiFailure implements Exception {
  final String message;
  const ApiFailure(this.message);
  @override
  String toString() => message;
}

class MediaPage {
  final List<MediaItem> items;
  final int page, totalPages;
  const MediaPage(this.items, this.page, this.totalPages);
}

class CatalogApi {
  final Library library;
  final http.Client client;
  final NativeSources? nativeSources;
  CatalogApi(this.library, {http.Client? client})
    : nativeSources = client == null && NativeSources.supported
          ? NativeSources(library)
          : null,
      client = client ?? http.Client();
  void close() => client.close();
  Future<dynamic> readJson(Uri uri) async {
    final response = await client.get(uri).timeout(const Duration(seconds: 35));
    if (response.statusCode != 200) {
      throw ApiFailure('Le service ne répond pas (${response.statusCode}).');
    }
    try {
      return jsonDecode(response.body);
    } on FormatException {
      throw const ApiFailure('Réponse du service illisible.');
    }
  }

  Future<Map<String, dynamic>> get(Uri uri) async {
    final data = await readJson(uri);
    if (data is! Map<String, dynamic>) {
      throw const ApiFailure('Réponse du service illisible.');
    }
    return data;
  }

  Future<Map<String, dynamic>> tmdb(
    String path, [
    Map<String, String> params = const {},
  ]) {
    if (library.apiKey.isEmpty) {
      throw const ApiFailure(
        'Ajoute une clé TMDB dans les paramètres pour la recherche et les fiches.',
      );
    }
    return get(
      Uri.https('api.themoviedb.org', '/3$path', {
        'api_key': library.apiKey,
        'language': library.language,
        ...params,
      }),
    );
  }

  Future<Map<String, dynamic>> proxy(Map<String, String> params) => get(
    Uri.parse('${library.backend}/api/tmdb-proxy')
        .replace(queryParameters: {'language': library.language, ...params}),
  );
  Future<MediaPage> list(
    String type, {
    int page = 1,
    String query = '',
    bool latest = false,
    bool anime = false,
    int? provider,
    int? genre,
    String? filter,
  }) async {
    final now = DateTime.now();
    final Map<String, dynamic> data;
    if (query.isNotEmpty) {
      data = await tmdb('/search/multi', {
        'query': query,
        'page': '$page',
        'include_adult': 'false',
      });
    } else if (provider != null) {
      data = await tmdb(
        '/discover/$type',
        ProviderCatalogPolicy.parameters(
          type,
          provider: provider,
          page: page,
          genre: genre,
          now: now,
        ),
      );
    } else if ((latest || filter != null) && !anime && genre == null) {
      data = await proxy({
        'type': type == 'tv' ? 'series' : 'movie',
        'filter': filter ?? 'last',
        'page': '$page',
      });
    } else {
      data = await tmdb('/discover/$type', {
        'page': '$page',
        'sort_by': latest
            ? (type == 'tv'
                  ? 'first_air_date.desc'
                  : 'primary_release_date.desc')
            : 'popularity.desc',
        if (latest && anime)
          (type == 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte'):
              DateTime.now().toIso8601String().substring(0, 10),
        if (latest && anime) 'vote_count.gte': '1',
        'include_adult': 'false',
        if (genre != null || anime) 'with_genres': '${genre ?? 16}',
        if (anime) 'with_original_language': 'ja',
      });
    }
    final items = <MediaItem>[];
    for (final raw in data['results'] as List? ?? []) {
      final row = Map<String, dynamic>.from(raw);
      final kind = query.isNotEmpty ? row['media_type'] : type;
      if (kind == 'person' || row['id'] == null || row['adult'] == true) {
        continue;
      }
      items.add(MediaItem.fromJson(row, type: kind));
    }
    return MediaPage(
      provider != null && query.isEmpty
          ? ProviderCatalogPolicy.releasedItems(items, now: now)
          : items,
      (data['page'] as num? ?? page).toInt(),
      (data['total_pages'] as num? ?? 1).toInt().clamp(1, 500),
    );
  }

  Future<Map<String, dynamic>> details(MediaItem item) => item.type == 'tv'
      ? proxy({'type': 'series', 'id': '${item.id}'})
      : tmdb('/movie/${item.id}', {
          'append_to_response': 'videos,recommendations,watch/providers',
        });
  Future<Map<String, dynamic>> season(int id, int season) =>
      proxy({'type': 'season', 'seriesId': '$id', 'seasonNumber': '$season'});
  Future<List<StreamSource>> sources(
    MediaItem item, {
    int? season,
    int? episode,
    void Function(SourceProgress)? onProgress,
  }) async {
    if (item.type == 'tv' && (season == null || episode == null)) {
      throw const ApiFailure(
        'Sélectionne un épisode pour afficher ses sources.',
      );
    }
    if (nativeSources != null) {
      try {
        final result = await nativeSources!.load(item, season, episode);
        onProgress?.call(SourceProgress(result, 0, const []));
        return result;
      } catch (_) {
        throw const ApiFailure(
          'Impossible de charger les sources du moteur iOS natif. Réessaie.',
        );
      }
    }
    final parameters = {
      'type': item.type,
      'tmdbId': '${item.id}',
      if (season != null) 'season': '$season',
      if (episode != null) 'episode': '$episode',
    };
    var isAnime = item.genreIds.contains(16);
    var englishTitle = item.title;
    var animeSeasons = <Map>[];
    // Search/history items may not carry genres. Recover them before deciding
    // whether to query the six anime providers.
    if (isAnime || item.genreIds.isEmpty) {
      try {
        final info = await tmdb('/${item.type}/${item.id}', {
          'language': 'en-US',
        });
        englishTitle = info['title'] ?? info['name'] ?? item.title;
        animeSeasons = (info['seasons'] as List? ?? [])
            .whereType<Map>()
            .toList();
        isAnime =
            isAnime ||
            (info['genres'] as List? ?? []).whereType<Map>().any(
              (g) => g['id'] == 16,
            );
      } catch (_) {
        /* Other providers still load when title translation fails. */
      }
    }
    final requests = [
      for (final path in ['vixsrc', 'moviebox', 'vaplayer', 'yflix'])
        {'path': path, ...parameters},
      {
        'path': 'afterdark',
        ...parameters,
        'title': item.title,
        if (item.date.length >= 4) 'year': item.date.substring(0, 4),
      },
      {
        'path': item.type == 'tv'
            ? 'fstream/tv/${item.id}/season/$season'
            : 'fstream/movie/${item.id}',
      },
      for (final provider in [
        'frenchstream',
        'streamzo',
        if (isAnime) ...['animesama', 'frenchanime'],
      ])
        {'path': 'french-provider', 'provider': provider, ...parameters},
      if (isAnime)
        for (final path in ['animepahe', 'hianime'])
          {'path': path, ...parameters},
      if (isAnime) {'path': 'anime-api', ...parameters, 'title': englishTitle},
      if (isAnime && item.type == 'tv')
        {
          'path':
              'anime/search/${item.id == 1429 ? "L’Attaque des Titans" : item.title.split(':').first.trim()}',
          'includeSeasons': 'true',
          'includeEpisodes': 'true',
        },
    ];
    var successful = 0, pending = requests.length;
    final failed = <String>[];
    final sources = <StreamSource>[];
    final seen = <String>{};
    await Future.wait(
      requests.map((params) async {
        final provider = params['provider'] ?? params['path']!;
        try {
          final direct = <StreamSource>[];
          if (provider == 'vixsrc') {
            try {
              direct.addAll(
                await DirectExtractors(client).vixsrc(item, season, episode),
              );
            } catch (_) {
              /* Proxy fallback below. */
            }
          }
          final dynamic payload = direct.isNotEmpty
              ? <String, dynamic>{'streams': []}
              : await readJson(
                  Uri.parse('${library.backend}/api/movix-proxy')
                      .replace(queryParameters: params),
                );
          final data = payload is Map<String, dynamic>
              ? payload
              : <String, dynamic>{};
          if (data['success'] == false || data['error'] != null) {
            throw const ApiFailure('Fournisseur indisponible.');
          }
          successful++;
          final rows = <Map<String, dynamic>>[];
          if (params['path']!.startsWith('anime/search/')) {
            final list = payload is List ? payload : data['results'];
            rows.addAll(
              parseMovixAnime(
                list,
                item,
                season ?? 1,
                episode ?? 1,
                tmdbSeasons: animeSeasons,
              ),
            );
          }
          for (final source in direct) {
            if (seen.add('${source.url}|${source.language}')) {
              sources.add(source);
            }
          }

          final flat =
              data['streams'] ?? data['sources'] ?? data['results'] ?? [];
          if (flat is List) {
            rows.addAll(
              flat.whereType<Map>().map((r) => Map<String, dynamic>.from(r)),
            );
          }
          // FStream groups movie players by language and TV players by episode.
          final episodeData = data['episodes'] is Map
              ? data['episodes']['$episode']
              : null;
          final groups = item.type == 'tv'
              ? (episodeData is Map ? episodeData['languages'] : null)
              : data['players'];
          if (groups is Map) {
            groups.forEach((language, players) {
              if (players is List) {
                for (final row in players.whereType<Map>()) {
                  rows.add({
                    ...Map<String, dynamic>.from(row),
                    'language': language == 'VOSTFR'
                        ? 'VOSTFR'
                        : ['VO', 'ENG', 'English'].contains(language)
                        ? 'VO'
                        : 'VF',
                    'type': row['type'] ?? 'embed',
                  });
                }
              }
            });
          }
          for (final row in rows) {
            final source = StreamSource.parse(
              row,
              provider,
              base: Uri.parse(library.backend),
            );
            if (source != null &&
                seen.add('${source.url}|${source.language}')) {
              sources.add(source);
            }
          }
        } catch (_) {
          failed.add(provider);
        } finally {
          pending--;
          onProgress?.call(
            SourceProgress(
              List.unmodifiable(sources),
              pending,
              List.unmodifiable(failed),
            ),
          );
        }
      }),
    );
    if (successful == 0) {
      throw const ApiFailure(
        'Les services de lecture sont indisponibles. Réessaie plus tard.',
      );
    }
    return sources;
  }

  static List<Map<String, dynamic>> parseMovixAnime(
    dynamic payload,
    MediaItem item,
    int season,
    int episode, {
    List<Map> tmdbSeasons = const [],
  }) {
    if (payload is! List) return [];
    String name(dynamic value) =>
        '$value'.toLowerCase().replaceAll(RegExp(r'[^a-z0-9à-ÿ]'), '');
    final title = name(item.title.split(':').first.trim());
    final candidates = payload.whereType<Map>();
    final anime =
        (item.id == 1429
            ? candidates
                  .where((r) => name(r['name']) == 'shingekinokyojin')
                  .firstOrNull
            : null) ??
        candidates
            .where((r) => name(r['name'] ?? r['title']) == title)
            .firstOrNull ??
        candidates
            .where(
              (r) =>
                  name(r['name'] ?? r['title']).contains(title) &&
                  title.isNotEmpty,
            )
            .firstOrNull;
    if (anime == null) return [];
    final seasons = (anime['seasons'] as List? ?? []).whereType<Map>();
    var targetSeason = season;
    var targetEpisode = episode;
    String? part;
    if (item.id == 1429 && season == 4) {
      if (episode <= 16) {
        part = 'Saison 4 partie 1';
      } else if (episode <= 28) {
        part = 'Saison 4 partie 2';
        targetEpisode -= 16;
      } else if (episode == 29 || episode == 30) {
        part = 'Saison 4 partie ${episode == 29 ? 3 : 4}';
        targetEpisode = 1;
      }
    } else if (item.id == 1429 && season == 0 && [36, 37].contains(episode)) {
      part = 'Saison 4 partie ${episode == 36 ? 3 : 4}';
      targetSeason = 4;
      targetEpisode = 1;
    }
    var selected = seasons
        .where(
          (r) => part != null
              ? r['name'] == part
              : r['index'] == targetSeason ||
                    name(r['name']) == name('Saison $targetSeason') ||
                    (season == 0 &&
                        RegExp(r'oav|special').hasMatch(name(r['name']))),
        )
        .firstOrNull;
    if (selected == null && part != null) {
      // Some current catalogues expose a full S4 rather than separate parts.
      selected = seasons
          .where(
            (r) =>
                r['index'] == targetSeason ||
                name(r['name']) == name('Saison $targetSeason'),
          )
          .firstOrNull;
      targetEpisode = season == 0 && item.id == 1429 ? episode - 7 : episode;
    }
    // Catalogues may number a long-running anime continuously across seasons.
    final absoluteEpisode =
        episode +
        tmdbSeasons
            .where(
              (s) =>
                  (s['season_number'] as num? ?? 0) > 0 &&
                  (s['season_number'] as num) < season,
            )
            .fold<int>(
              0,
              (sum, s) => sum + (s['episode_count'] as num? ?? 0).toInt(),
            );
    final eps = (selected?['episodes'] as List? ?? []).whereType<Map>();
    var ep = eps
        .where(
          (r) =>
              r['index'] == targetEpisode ||
              int.tryParse(
                    RegExp(r'\d+').firstMatch('${r['name']}')?.group(0) ?? '',
                  ) ==
                  targetEpisode,
        )
        .firstOrNull;
    if (ep == null && tmdbSeasons.isNotEmpty && season > 0) {
      ep = seasons
          .expand((s) => (s['episodes'] as List? ?? []).whereType<Map>())
          .where((e) => e['index'] == absoluteEpisode)
          .firstOrNull;
    }
    if (ep == null) return [];
    final rows = <Map<String, dynamic>>[];
    for (final link
        in (ep['streaming_links'] as List? ?? []).whereType<Map>()) {
      for (final value in link['players'] as List? ?? []) {
        if (value is String &&
            ['https', 'http'].contains(Uri.tryParse(value.trim())?.scheme)) {
          final uri = Uri.parse(value.trim());
          final host = uri.host.toLowerCase();
          final provider =
              [
                'vidmoly',
                'vidzy',
                'ansembed',
                'minochinos',
                'sendvid',
                'uqload',
                'voe',
              ].where(host.contains).firstOrNull ??
              host;
          rows.add({
            'url': uri.toString(),
            'provider': provider,
            'quality': 'HD',
            'type': 'embed',
            'language': link['language'] ?? 'VF',
          });
        }
      }
    }
    return rows;
  }

  Future<StreamSource> resolveSource(StreamSource source) async {
    if (!source.needsExtraction) return source;
    if (nativeSources != null) {
      try {
        final resolved = await nativeSources!.resolve(source);
        if (resolved != null && !resolved.needsExtraction) return resolved;
      } catch (_) {
        if (source.provider.toLowerCase().contains('vidzy') ||
            Uri.parse(source.url).host.contains('vidzy')) {
          throw const ApiFailure(
            'Impossible d’autoriser la lecture Vidzy. Réessaie ou choisis une autre source.',
          );
        }
        /* Existing extractors below remain available on failure. */
      }
    }
    final host = Uri.parse(source.url).host.toLowerCase();
    final type =
        [
              'vidzy',
              'vidmoly',
              'darkibox',
              'luluvid',
              'voe',
              'fsvid',
              'bysebuho',
              'vsembed',
              'flaswish',
            ]
            .where(
              (name) =>
                  host.contains(name) ||
                  source.provider.toLowerCase().contains(name),
            )
            .firstOrNull;
    if (type == null || ['vidzy', 'vidmoly', 'fsvid'].contains(type)) {
      try {
        final direct = await DirectExtractors(client).embed(source);
        if (direct != null) return direct;
      } catch (_) {
        /* Keep the existing server extractor as fallback. */
      }
    }
    if (type == null) {
      throw const ApiFailure(
        'Cet hébergeur ne peut pas encore être ouvert dans le lecteur. Choisis un autre lien.',
      );
    }
    final response = await client
        .post(
          Uri.parse('${library.backend}/api/extract'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'type': type, 'url': source.url}),
        )
        .timeout(const Duration(seconds: 40));
    try {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final resolved = StreamSource.parse(
        {
          ...data,
          'url':
              data['m3u8Url'] ??
              data['extractedUrl'] ??
              data['url'] ??
              data['file'],
          'type': 'hls',
          'provider': source.provider,
          'quality': source.quality,
          'language': source.language,
          'tracks':
              data['tracks'] ??
              source.subtitles.map((t) => t.toJson()).toList(),
        },
        source.provider,
        base: Uri.parse(library.backend),
      );
      if (response.statusCode != 200 ||
          data['success'] == false ||
          resolved == null) {
        throw const FormatException();
      }
      return resolved;
    } catch (_) {
      throw const ApiFailure(
        'Impossible d’ouvrir ce lien. Essaie un autre hébergeur.',
      );
    }
  }
}

class SourceProgress {
  final List<StreamSource> sources;
  final int pending;
  final List<String> failed;
  const SourceProgress(this.sources, this.pending, this.failed);
}
