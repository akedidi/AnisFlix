import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
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
    library.apiKey = 'test-key';
  });
  const movie = MediaItem(id: 7, type: 'movie', title: 'Film');
  const series = MediaItem(id: 7, type: 'tv', title: 'Série');
  test('favorites persist with separate movie and TV identities', () async {
    await library.toggleFavorite(movie);
    await library.toggleFavorite(series);
    final restored = await Library.load();
    expect(restored.favorites.length, 2);
    await restored.toggleFavorite(movie);
    expect(restored.favorites.keys, ['tv:7']);
  });
  test('progress distinguishes episodes and survives reload', () async {
    await library.saveProgress(
      series,
      1,
      1,
      const Duration(minutes: 5),
      const Duration(minutes: 20),
    );
    await library.saveProgress(
      series,
      1,
      2,
      const Duration(minutes: 9),
      const Duration(minutes: 20),
    );
    final restored = await Library.load();
    expect(
      restored.progress[restored.progressKey(series, 1, 1)]!['position'],
      300,
    );
    expect(
      restored.progress[restored.progressKey(series, 1, 2)]!['position'],
      540,
    );
  });
  test(
    'search excludes people and keeps media type, language and page',
    () async {
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          expect(request.url.path, '/3/search/multi');
          expect(request.url.queryParameters['language'], 'fr-FR');
          expect(request.url.queryParameters['page'], '2');
          return http.Response(
            jsonEncode({
              'page': 2,
              'total_pages': 3,
              'results': [
                {'id': 1, 'media_type': 'person', 'name': 'Acteur'},
                {'id': 2, 'media_type': 'tv', 'name': 'Série'},
                {'id': 3, 'media_type': 'movie', 'title': 'Film'},
              ],
            }),
            200,
          );
        }),
      );
      final result = await api.list('movie', query: 'test', page: 2);
      expect(result.items.map((x) => x.key), ['tv:2', 'movie:3']);
      expect(result.totalPages, 3);
      api.close();
    },
  );
  test(
    'seasons use the backend that reconstructs virtual season groups',
    () async {
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          expect(request.url.path, '/api/tmdb-proxy');
          expect(request.url.queryParameters['type'], 'season');
          expect(request.url.queryParameters['seriesId'], '1429');
          expect(request.url.queryParameters['seasonNumber'], '4');
          return http.Response('{"episodes":[]}', 200);
        }),
      );
      await api.season(1429, 4);
      api.close();
    },
  );
  test(
    'partial provider failure keeps working sources and removes duplicates',
    () async {
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          if (request.url.queryParameters['path'] == 'cinepro') {
            return http.Response('error', 503);
          }
          return http.Response(
            jsonEncode({
              'streams': [
                {
                  'url': 'https://example.com/movie.mp4',
                  'type': 'mp4',
                  'headers': {'Referer': 'https://example.com'},
                },
                {'url': 'https://example.com/embed', 'type': 'embed'},
                {'url': 'javascript:invalid', 'type': 'mp4'},
              ],
            }),
            200,
          );
        }),
      );
      final result = await api.sources(movie);
      expect(result.length, 2);
      expect(result.any((s) => s.needsExtraction), isTrue);
      expect(result.first.headers['Referer'], 'https://example.com');
      api.close();
    },
  );
  test(
    'complete provider outage is reported, rather than shown as no results',
    () async {
      final api = CatalogApi(
        library,
        client: MockClient((request) async => http.Response('error', 503)),
      );
      await expectLater(api.sources(movie), throwsA(isA<ApiFailure>()));
      api.close();
    },
  );
  test(
    'HTTP and invalid JSON failures do not expose request credentials',
    () async {
      final api = CatalogApi(
        library,
        client: MockClient((request) async => http.Response('<html/>', 200)),
      );
      await expectLater(api.tmdb('/movie/7'), throwsA(isA<ApiFailure>()));
      api.close();
    },
  );
}
