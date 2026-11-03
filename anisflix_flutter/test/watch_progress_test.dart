import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/screens/details.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/media_category_row.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Library library;
  const movie = MediaItem(id: 7, type: 'movie', title: 'Film');
  const series = MediaItem(id: 7, type: 'tv', title: 'Série');
  const latest = MediaItem(
    id: 7,
    type: 'tv',
    title: 'Dernier épisode',
    latestSeason: 2,
    latestEpisode: 3,
  );

  Future<void> save(
    MediaItem item,
    int position, {
    int? season,
    int? episode,
  }) => library.saveProgress(
    item,
    season,
    episode,
    Duration(seconds: position),
    const Duration(seconds: 100),
  );

  Finder indicators(Finder parent) => find.descendant(
    of: parent,
    matching: find.byType(LinearProgressIndicator),
  );

  double? value(WidgetTester tester, Finder parent) =>
      tester.widget<LinearProgressIndicator>(indicators(parent)).value;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    library.apiKey = 'fixture';
  });

  test(
    'progress follows media identity, last playback and explicit episodes',
    () async {
      expect(library.progressFraction(movie), isNull);
      await save(movie, 40);
      await save(series, 20, season: 1, episode: 1);
      await save(series, 60, season: 2, episode: 3);
      // Replaying an older episode must take precedence over episode order.
      library.progress[library.progressKey(series, 2, 3)]!['updated'] =
          '2026-11-01T10:00:00.000';
      await save(series, 30, season: 1, episode: 1);
      final restored = await Library.load();
      expect(restored.progressFraction(movie), .4);
      expect(restored.progressFraction(series), .3);
      expect(restored.progressFraction(latest), .6);
      expect(restored.progressFraction(series, season: 1, episode: 1), .3);
      expect(restored.progressFraction(series, season: 1, episode: 2), isNull);
      expect(
        restored.progressFraction(
          const MediaItem(id: 70, type: 'tv', title: 'Autre série'),
        ),
        isNull,
      );
    },
  );

  test(
    'bars include short and completed playback and reject invalid values',
    () async {
      await save(movie, 1);
      expect(library.progressFraction(movie), .01);
      await save(movie, 96);
      expect(library.progressFraction(movie), .96);
      await save(movie, 105);
      expect(library.progressFraction(movie), 1);
      await save(movie, 0);
      expect(library.progressFraction(movie), isNull);
      final saved = library.progress[library.progressKey(movie, null, null)]!;
      for (final duration in [
        0,
        -1,
        double.nan,
        double.infinity,
        '100',
        null,
      ]) {
        saved['position'] = 50;
        saved['duration'] = duration;
        expect(library.progressFraction(movie), isNull);
      }
    },
  );

  for (final width in [390.0, 1280.0]) {
    testWidgets('carousel bars update in place at width $width', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final page = Future.value(MediaPage([movie, series], 1, 1));
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MediaCategoryRow(
              title: 'Films et séries',
              future: page,
              library: library,
              tv: width > 600,
              seeAll: () {},
              retry: () {},
              onSelected: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.byType(LinearProgressIndicator), findsNothing);
      await save(movie, 40);
      await save(series, 60, season: 2, episode: 3);
      await tester.pumpAndSettle();
      final cards = find.byType(MediaCard);
      expect(value(tester, cards.at(0)), .4);
      expect(value(tester, cards.at(1)), .6);
      await save(movie, 80);
      await tester.pumpAndSettle();
      expect(value(tester, cards.at(0)), .8);
      expect(value(tester, cards.at(1)), .6);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets('latest episode cards only show their own playback', (
    tester,
  ) async {
    await save(series, 70, season: 1, episode: 1);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 145,
            height: 250,
            child: MediaCard(item: latest, library: library, onTap: () {}),
          ),
        ),
      ),
    );
    expect(find.byType(LinearProgressIndicator), findsNothing);
    await save(series, 25, season: 2, episode: 3);
    await tester.pumpAndSettle();
    expect(value(tester, find.byType(MediaCard)), .25);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('favorites grid restores saved movie and series bars', (
    tester,
  ) async {
    await library.toggleFavorite(movie);
    await library.toggleFavorite(series);
    await save(movie, 40);
    await save(series, 60, season: 2, episode: 3);
    final restored = await Library.load();
    final api = CatalogApi(restored);
    addTearDown(api.close);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CatalogScreen(
            api: api,
            library: restored,
            section: 5,
            tv: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final cards = find.byType(MediaCard);
    expect(value(tester, cards.at(0)), .4);
    expect(value(tester, cards.at(1)), .6);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  for (final width in [390.0, 1280.0]) {
    testWidgets('episode list and recommendations track progress at $width', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await save(series, 20, season: 1, episode: 1);
      await save(series, 60, season: 2, episode: 1);
      final api = CatalogApi(
        library,
        client: MockClient(
          (request) async => http.Response(
            jsonEncode(
              request.url.queryParameters['type'] == 'season'
                  ? {
                      'episodes': [
                        for (final number in [1, 2])
                          {
                            'episode_number': number,
                            'name': 'Épisode $number',
                            'overview': 'Résumé de cet épisode.',
                          },
                      ],
                    }
                  : {
                      'seasons': [
                        {'season_number': 1, 'name': 'Saison 1'},
                        {'season_number': 2, 'name': 'Saison 2'},
                      ],
                      'recommendations': {
                        'results': [series.toJson()],
                      },
                    },
            ),
            200,
          ),
        ),
      );
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          home: DetailScreen(api: api, library: library, item: series),
        ),
      );
      await tester.pumpAndSettle();
      var episodeSeason = 1;
      Finder episodeTile(int number) =>
          find.byKey(ValueKey('episode-card-$episodeSeason-$number'));
      expect(value(tester, episodeTile(1)), .2);
      expect(indicators(episodeTile(2)), findsNothing);
      expect(value(tester, find.byType(MediaCard)), .6);
      await tester.ensureVisible(find.text('Saison 2'));
      await tester.tap(find.text('Saison 2'));
      await tester.pumpAndSettle();
      episodeSeason = 2;
      expect(value(tester, episodeTile(1)), .6);
      expect(indicators(episodeTile(2)), findsNothing);
      await save(series, 100, season: 2, episode: 2);
      await tester.pumpAndSettle();
      expect(value(tester, episodeTile(2)), 1);
      expect(value(tester, find.byType(MediaCard)), 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }
}
