import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/screens/home.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets(
    'all TV home categories load and popular anime movies open a movie catalogue',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      library.apiKey = 'fixture';
      final requests = <Uri>[];
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          requests.add(r.url);
          return http.Response(
            jsonEncode({
              'results': [
                const MediaItem(id: 1, type: 'movie', title: 'Film').toJson(),
              ],
            }),
            200,
          );
        }),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HomeScreen(api: api, library: library, tv: true),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(requests.length, 9);
      expect(
        requests.any((r) => r.queryParameters['filter'] == 'last-episodes'),
        isTrue,
      );
      expect(
        requests
            .where(
              (r) =>
                  r.path == '/3/discover/movie' &&
                  r.queryParameters['with_genres'] == '16',
            )
            .length,
        2,
      );
      final target = find.text('Anime - Films Populaires');
      await tester.scrollUntilVisible(
        target,
        500,
        scrollable: find.byType(Scrollable).first,
      );
      final row = find.ancestor(of: target, matching: find.byType(Row)).first;
      await tester.tap(
        find.descendant(of: row, matching: find.text('Voir tout')),
      );
      await tester.pumpAndSettle();
      final catalogue = tester.widget<CatalogScreen>(
        find.byType(CatalogScreen),
      );
      expect(catalogue.initialMediaType, 'movie');
      expect(catalogue.latestOverride, isFalse);
      expect(find.text('Anime - Films Populaires'), findsOneWidget);
      expect(find.text('Animés'), findsNothing);
      expect(find.byType(DropdownButton<int?>), findsNothing);
      expect(find.byType(SegmentedButton<String>), findsNothing);
      expect(requests.last.path, '/3/discover/movie');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      api.close();
    },
  );
  test('latest episodes preserve their season and episode when stored', () {
    final item = MediaItem.fromJson({
      'id': 7,
      'name': 'Série',
      'media_type': 'tv',
      'episodeInfo': {'season': 2, 'episode': 3},
    });
    final restored = MediaItem.fromJson(item.toJson());
    expect(restored.latestSeason, 2);
    expect(restored.latestEpisode, 3);
  });
}
