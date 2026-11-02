import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/media.dart';
import 'library.dart';

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
  CatalogApi(this.library, {http.Client? client})
    : client = client ?? http.Client();
  void close() => client.close();
  Future<Map<String, dynamic>> get(Uri uri) async {
    final response = await client.get(uri).timeout(const Duration(seconds: 25));
    if (response.statusCode != 200) {
      throw ApiFailure('Le service ne répond pas (${response.statusCode}).');
    }
    try {
      final data = jsonDecode(response.body);
      if (data is! Map<String, dynamic>) throw const FormatException();
      return data;
    } on FormatException {
      throw const ApiFailure('Réponse du service illisible.');
    }
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
  }) async {
    final Map<String, dynamic> data;
    if (query.isNotEmpty) {
      data = await tmdb('/search/multi', {
        'query': query,
        'page': '$page',
        'include_adult': 'false',
      });
    } else if (latest && !anime && provider == null) {
      data = await proxy({
        'type': type == 'tv' ? 'series' : 'movie',
        'filter': 'last',
        'page': '$page',
      });
    } else {
      data = await tmdb('/discover/$type', {
        'page': '$page',
        'sort_by': 'popularity.desc',
        'include_adult': 'false',
        if (anime) 'with_genres': '16',
        if (anime) 'with_original_language': 'ja',
        if (provider != null) 'with_watch_providers': '$provider',
        if (provider != null) 'watch_region': 'FR',
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
      items,
      (data['page'] as num? ?? page).toInt(),
      (data['total_pages'] as num? ?? 1).toInt().clamp(1, 500),
    );
  }

  Future<Map<String, dynamic>> details(MediaItem item) => item.type == 'tv'
      ? proxy({'type': 'series', 'id': '${item.id}'})
      : tmdb('/movie/${item.id}');
  Future<Map<String, dynamic>> season(int id, int season) =>
      proxy({'type': 'season', 'seriesId': '$id', 'seasonNumber': '$season'});
  Future<List<StreamSource>> sources(
    MediaItem item, {
    int? season,
    int? episode,
  }) async {
    final parameters = {
      'type': item.type,
      'tmdbId': '${item.id}',
      if (season != null) 'season': '$season',
      if (episode != null) 'episode': '$episode',
    };
    final requests = [
      {'path': 'vixsrc', ...parameters},
      {'path': 'cinepro', ...parameters},
      for (final provider in [
        'frenchstream',
        'streamzo',
        'animesama',
        'frenchanime',
      ])
        {'path': 'french-provider', 'provider': provider, ...parameters},
    ];
    var successful = 0;
    final batches = await Future.wait(
      requests.map((params) async {
        try {
          final data = await get(
            Uri.parse('${library.backend}/api/movix-proxy')
                .replace(queryParameters: params),
          );
          successful++;
          final rows = data['streams'] ?? data['sources'] ?? [];
          if (rows is! List) return <StreamSource>[];
          return rows
              .whereType<Map>()
              .map(
                (row) => StreamSource.parse(
                  Map<String, dynamic>.from(row),
                  params['provider'] ?? params['path']!,
                ),
              )
              .whereType<StreamSource>()
              .toList();
        } catch (_) {
          return <StreamSource>[];
        }
      }),
    );
    final seen = <String>{};
    final sources = batches
        .expand((x) => x)
        .where((x) => seen.add(x.url))
        .toList();
    if (successful == 0) {
      throw const ApiFailure(
        'Les services de lecture sont indisponibles. Réessaie plus tard.',
      );
    }
    return sources;
  }
}
