import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/screens/details.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/theme_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

const series = MediaItem(id: 7, type: 'tv', title: 'Série');
final synopsis = List.filled(
  8,
  'Les personnages découvrent un nouvel indice et partent explorer la ville.',
).join(' ');

class SeriesCatalog extends CatalogApi {
  final sourceCalls = <(int?, int?)>[];
  final pending = <(int?, int?), Completer<List<StreamSource>>>{};
  Completer<Map<String, dynamic>>? pendingSeason;
  SeriesCatalog(super.library);

  @override
  Future<MediaPage> list(
    String type, {
    int page = 1,
    String query = '',
    bool latest = false,
    bool anime = false,
    int? provider,
    int? genre,
    String? filter,
  }) async => const MediaPage(
    [
      MediaItem(
        id: 7,
        type: 'tv',
        title: 'Série',
        latestSeason: 2,
        latestEpisode: 3,
      ),
    ],
    1,
    1,
  );

  @override
  Future<Map<String, dynamic>> details(MediaItem item) async => {
    'overview': 'Le synopsis de la série.',
    'seasons': [
      {'season_number': 1, 'name': 'Saison 1'},
      {'season_number': 2, 'name': 'Saison 2'},
    ],
  };

  Map<String, dynamic> seasonData(int season) => {
    'episodes': [
      for (final number in [1, 2, 3])
        {
          'episode_number': number,
          'name': 'Titre $season-$number',
          'overview': number == 2 ? '' : '$synopsis Fin $season-$number.',
          if (number != 2) 'still_path': '/still-$season-$number.jpg',
        },
    ],
  };

  @override
  Future<Map<String, dynamic>> season(int id, int season) async =>
      season == 2 && pendingSeason != null
      ? pendingSeason!.future
      : seasonData(season);

  @override
  Future<List<StreamSource>> sources(
    MediaItem item, {
    int? season,
    int? episode,
    void Function(SourceProgress)? onProgress,
  }) async {
    sourceCalls.add((season, episode));
    return pending[(season, episode)]?.future ?? links(season!, episode!);
  }

  List<StreamSource> links(int season, int episode) => [
    StreamSource(
      'https://example.com/$season-$episode.mp4',
      'Lien $season-$episode',
      provider: 'Fournisseur $season-$episode',
      quality: '1080p',
      language: 'VF',
    ),
  ];
}

void main() {
  late Library library;
  late SeriesCatalog api;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    api = SeriesCatalog(library);
  });
  tearDown(() => api.close());

  Widget app({int? season, int? episode}) => MaterialApp(
    home: DetailScreen(
      api: api,
      library: library,
      item: series,
      initialSeason: season,
      initialEpisode: episode,
    ),
  );

  Future<void> choose(WidgetTester tester, int season, int episode) async {
    final title = find.text('$episode. Titre $season-$episode');
    await tester.ensureVisible(title);
    await tester.pumpAndSettle();
    await tester.tap(title);
    await tester.pumpAndSettle();
  }

  for (final width in [320.0, 390.0, 1280.0]) {
    testWidgets('complete episodes and inline sources fit width $width', (
      tester,
    ) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();

      expect(api.sourceCalls, isEmpty);
      expect(find.byType(ThemePicker), findsNothing);
      final text = tester.widget<Text>(find.text('$synopsis Fin 1-1.'));
      expect(text.maxLines, isNull);
      expect(text.overflow, isNot(TextOverflow.ellipsis));
      final thumbnail = find.byKey(const ValueKey('episode-thumbnail-1-1'));
      final image = tester.widget<Image>(
        find.descendant(of: thumbnail, matching: find.byType(Image)),
      );
      expect(
        (image.image as CachedNetworkImageProvider).url,
        'https://image.tmdb.org/t/p/w300/still-1-1.jpg',
      );
      final missingThumbnail = find.byKey(
        const ValueKey('episode-thumbnail-1-2'),
      );
      expect(
        find.descendant(of: missingThumbnail, matching: find.byType(Image)),
        findsNothing,
      );
      expect(find.text('Aucun résumé disponible.'), findsOneWidget);

      await choose(tester, 1, 3);
      expect(api.sourceCalls, [(1, 3)]);
      expect(find.byType(DetailScreen), findsOneWidget);
      expect(
        Navigator.of(tester.element(find.byType(DetailScreen))).canPop(),
        isFalse,
      );
      var panel = tester.widget<SourcesPanel>(find.byType(SourcesPanel));
      expect((panel.season, panel.episode), (1, 3));
      expect(find.text('Saison 1 · Épisode 3'), findsOneWidget);
      if (width < 850) {
        expect(
          find.descendant(
            of: find.byKey(const ValueKey('episode-card-1-3')),
            matching: find.byType(SourcesPanel),
          ),
          findsOneWidget,
        );
        expect(find.text('Sources disponibles').hitTestable(), findsOneWidget);
      } else {
        expect(
          tester.getTopLeft(find.byType(SourcesPanel)).dx,
          greaterThan(width * .6),
        );
      }

      await choose(tester, 1, 1);
      panel = tester.widget<SourcesPanel>(find.byType(SourcesPanel));
      expect((panel.season, panel.episode), (1, 1));
      expect(find.text('Saison 1 · Épisode 3'), findsNothing);
      expect(find.textContaining('Fournisseur 1-3'), findsNothing);
      expect(find.textContaining('Fournisseur 1-1'), findsOneWidget);

      await tester.ensureVisible(find.text('Saison 2'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Saison 2'));
      await tester.pumpAndSettle();
      expect(find.byType(SourcesPanel), findsNothing);
      await choose(tester, 2, 2);
      panel = tester.widget<SourcesPanel>(find.byType(SourcesPanel));
      expect((panel.season, panel.episode), (2, 2));
      expect(api.sourceCalls, [(1, 3), (1, 1), (2, 2)]);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets('resume opens the selected episode inside the series details', (
    tester,
  ) async {
    await tester.pumpWidget(app(season: 2, episode: 3));
    await tester.pumpAndSettle();
    final panel = tester.widget<SourcesPanel>(find.byType(SourcesPanel));
    expect((panel.season, panel.episode), (2, 3));
    expect(api.sourceCalls, [(2, 3)]);
    expect(find.text('1. Titre 2-1'), findsOneWidget);
    expect(find.text('Saison 2 · Épisode 3'), findsOneWidget);
    expect(find.byType(ThemePicker), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'late sources from a previous episode never replace the selection',
    (tester) async {
      final stale = Completer<List<StreamSource>>();
      api.pending[(1, 1)] = stale;
      await tester.pumpWidget(app());
      await tester.pumpAndSettle();
      final first = find.text('1. Titre 1-1');
      await tester.ensureVisible(first);
      await tester.tap(first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));
      // The first request is still loading while another episode is selected.
      await tester.ensureVisible(find.text('3. Titre 1-3'));
      await tester.pump();
      await tester.tap(find.text('3. Titre 1-3'));
      await tester.pumpAndSettle();
      stale.complete(api.links(1, 1));
      await tester.pumpAndSettle();
      expect(api.sourceCalls, [(1, 1), (1, 3)]);
      expect(find.textContaining('Fournisseur 1-1'), findsNothing);
      expect(find.textContaining('Fournisseur 1-3'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('latest episode catalogue opens the complete series interface', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CatalogScreen(
            api: api,
            library: library,
            section: 2,
            tv: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Série'));
    await tester.pumpAndSettle();
    expect(find.byType(DetailScreen), findsOneWidget);
    expect(find.text('Saisons et épisodes'), findsOneWidget);
    expect(find.text('1. Titre 2-1'), findsOneWidget);
    final panel = tester.widget<SourcesPanel>(find.byType(SourcesPanel));
    expect((panel.season, panel.episode), (2, 3));
    expect(api.sourceCalls, [(2, 3)]);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('changing season hides old episodes while the new list loads', (
    tester,
  ) async {
    final season = Completer<Map<String, dynamic>>();
    api.pendingSeason = season;
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Saison 2'));
    await tester.tap(find.text('Saison 2'));
    await tester.pump();
    expect(find.text('1. Titre 1-1'), findsNothing);
    expect(api.sourceCalls, isEmpty);
    season.complete(api.seasonData(2));
    await tester.pumpAndSettle();
    expect(find.text('1. Titre 2-1'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
