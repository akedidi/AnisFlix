import 'dart:async';
import 'dart:convert';

import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/details.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/theme_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Library library;
  const movie = MediaItem(id: 550, type: 'movie', title: 'Fight Club');
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    library.apiKey = 'test-key';
  });
  Map<String, Object> row(String lang) => {
    'url': 'https://example.com/$lang.mp4',
    'type': 'mp4',
    'quality': '1080p',
    'provider': 'MovieBox',
    'language': lang,
  };
  test('MovieBox sources arrive before a stalled provider and retain their headers', () async {
    final slow = Completer<http.Response>();
    final updates = <SourceProgress>[];
    final api = CatalogApi(
      library,
      client: MockClient((r) async {
        final path = r.url.queryParameters['path'];
        if (path == 'vixsrc') return slow.future;
        if (path == 'moviebox') {
          return http.Response(
            jsonEncode({
              'streams': [
                {
                  ...row('VF'),
                  'headers': {'Cookie': 'fixture-cookie'},
                },
                row('VO'),
              ],
            }),
            200,
          );
        }
        return http.Response('{"streams":[]}', 200);
      }),
    );
    final future = api.sources(movie, onProgress: updates.add);
    await Future<void>.delayed(Duration.zero);
    expect(updates.any((u) => u.sources.length == 2 && u.pending > 0), isTrue);
    slow.complete(http.Response('error', 503));
    final result = await future;
    expect(result.first.headers['Cookie'], 'fixture-cookie');
    expect(updates.last.pending, 0);
    expect(updates.last.failed, contains('vixsrc'));
    api.close();
  });
  test(
    'FStream selects only the requested episode and preserves embed links',
    () async {
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          if (!r.url.queryParameters['path']!.startsWith('fstream/')) {
            return http.Response('{"streams":[]}', 200);
          }
          expect(r.url.queryParameters['path'], 'fstream/tv/7/season/2');
          return http.Response(
            jsonEncode({
              'episodes': {
                '1': {
                  'languages': {
                    'VF': [
                      {'url': 'https://example.com/wrong', 'type': 'embed'},
                    ],
                  },
                },
                '3': {
                  'languages': {
                    'VFF': [
                      {
                        'url': 'https://vidzy.org/embed-test.html',
                        'player': 'Vidzy',
                        'type': 'embed',
                      },
                    ],
                  },
                },
              },
            }),
            200,
          );
        }),
      );
      final result = await api.sources(
        const MediaItem(id: 7, type: 'tv', title: 'Série'),
        season: 2,
        episode: 3,
      );
      expect(result.single.languageGroup, 'VF');
      expect(result.single.needsExtraction, isTrue);
      expect(result.single.provider, 'Vidzy');
      api.close();
    },
  );
  test('embed extraction is deferred until selecting a link', () async {
    final api = CatalogApi(
      library,
      client: MockClient((r) async {
        if (r.method == 'GET') return http.Response('unavailable', 503);
        expect(r.method, 'POST');
        expect(r.url.path, '/api/extract');
        expect(jsonDecode(r.body)['type'], 'vidzy');
        return http.Response(
          jsonEncode({
            'success': true,
            'm3u8Url': 'https://example.com/video.m3u8',
            'headers': {'Referer': 'https://vidzy.org/'},
          }),
          200,
        );
      }),
    );
    final resolved = await api.resolveSource(
      const StreamSource(
        'https://vidzy.org/embed-test.html',
        'Vidzy',
        provider: 'vidzy',
        format: 'embed',
        language: 'VF',
      ),
    );
    expect(resolved.url, endsWith('video.m3u8'));
    expect(resolved.needsExtraction, isFalse);
    expect(resolved.headers['Referer'], 'https://vidzy.org/');
    api.close();
  });
  for (final size in [const Size(1280, 800), const Size(390, 844)]) {
    testWidgets(
      'movie sources live inside details at $size and language filters work',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = CatalogApi(
          library,
          client: MockClient(
            (r) async => http.Response(
              jsonEncode(
                r.url.path.startsWith('/3/')
                    ? {'runtime': 139}
                    : {
                        'streams': [row('VF'), row('VO')],
                      },
              ),
              200,
            ),
          ),
        );
        await tester.pumpWidget(
          MaterialApp(
            theme: appTheme(Brightness.dark),
            home: DetailScreen(api: api, library: library, item: movie),
          ),
        );
        await tester.pumpAndSettle();
        final sources = find.byType(SourcesPanel);
        if (size.width >= 850) {
          expect(tester.getTopLeft(sources).dx, greaterThan(size.width * .6));
          expect(find.text('Sources disponibles'), findsOneWidget);
        } else {
          await tester.scrollUntilVisible(
            find.text('Sources disponibles'),
            300,
            scrollable: find.byType(Scrollable).first,
          );
        }
        expect(find.textContaining('— VF'), findsOneWidget);
        await tester.tap(find.text('VO', skipOffstage: false).last);
        await tester.pumpAndSettle();
        expect(find.textContaining('— VO'), findsOneWidget);
        expect(find.textContaining('— VF'), findsNothing);
        expect(find.byType(DetailScreen), findsOneWidget);
        expect(find.byType(ThemePicker), findsNothing);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        api.close();
      },
    );
  }
  testWidgets('series details show sources inline for the selected episode', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final requests = <Uri>[];
    final api = CatalogApi(
      library,
      client: MockClient((r) async {
        requests.add(r.url);
        return http.Response(
          jsonEncode(
            r.url.path == '/api/tmdb-proxy'
                ? r.url.queryParameters['type'] == 'season'
                      ? {
                          'episodes': [
                            {
                              'episode_number': 3,
                              'name': 'Le retour',
                              'overview': 'Résumé',
                            },
                          ],
                        }
                      : {
                          'seasons': [
                            {'season_number': 2, 'name': 'Saison 2'},
                          ],
                        }
                : {
                    'streams': [row('VF')],
                  },
          ),
          200,
        );
      }),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: DetailScreen(
          api: api,
          library: library,
          item: const MediaItem(id: 7, type: 'tv', title: 'Série'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('3. Le retour'));
    await tester.pumpAndSettle();
    expect(find.byType(DetailScreen), findsOneWidget);
    expect(
      Navigator.of(tester.element(find.byType(DetailScreen))).canPop(),
      isFalse,
    );
    expect(find.byType(ThemePicker), findsNothing);
    expect(find.text('Sources disponibles'), findsOneWidget);
    expect(find.text('Saison 2 · Épisode 3'), findsOneWidget);
    final requested = requests
        .where((r) => r.queryParameters['path'] == 'moviebox')
        .single;
    expect(requested.queryParameters['season'], '2');
    expect(requested.queryParameters['episode'], '3');
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    api.close();
  });
  testWidgets('theme choice persists and updates the application', (
    tester,
  ) async {
    await tester.pumpWidget(AnisFlixApp(library: library));
    await tester.pump();
    expect(
      tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
      ThemeMode.dark,
    );
    await library.setThemeMode(ThemeMode.light);
    await tester.pumpAndSettle();
    expect(
      tester.widget<MaterialApp>(find.byType(MaterialApp)).themeMode,
      ThemeMode.light,
    );
    expect((await Library.load()).themeMode, ThemeMode.light);
    await tester.pumpWidget(const SizedBox());
  });
}
