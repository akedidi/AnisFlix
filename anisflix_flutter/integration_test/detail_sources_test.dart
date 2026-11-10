import 'dart:io';
import 'dart:convert';
import 'dart:ui' as ui;

import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/details.dart';
import 'package:anisflix_flutter/screens/home.dart';
import 'package:anisflix_flutter/screens/providers.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/source_list_policy.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('native platform directory renders the square logos', (
    tester,
  ) async {
    final library = await Library.load();
    final api = CatalogApi(library);
    const key = ValueKey('platform-capture');
    await tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: appTheme(Brightness.dark),
        home: Scaffold(
          body: RepaintBoundary(
            key: key,
            child: ProviderDirectoryScreen(
              api: api,
              library: library,
              tv: false,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Netflix'), findsOneWidget);
    expect(find.text('M6+'), findsOneWidget);
    final boundary = tester.renderObject<RenderRepaintBoundary>(
      find.byKey(key),
    );
    final image = await boundary.toImage(pixelRatio: 1.5);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File(
      '${Directory.systemTemp.path}/anisflix-platforms-native.png',
    );
    await file.writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
    debugPrint('PLATFORMS_SCREENSHOT=${file.path}');
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    api.close();
  });
  testWidgets(
    'real movie sources appear in the TV style desktop detail, in both themes',
    (tester) async {
      final library = await Library.load();
      final api = CatalogApi(library);
      final data = await api.tmdb('/movie/969681');
      final item = MediaItem.fromJson(data, type: 'movie');
      const capture = ValueKey('detail-capture');
      await library.setThemeMode(ThemeMode.dark);
      await tester.pumpWidget(
        Align(
          alignment: Alignment.topLeft,
          child: RepaintBoundary(
            key: capture,
            child: SizedBox(
              width: 960,
              height: 540,
              child: AnimatedBuilder(
                animation: library,
                builder: (_, _) => MaterialApp(
                  theme: appTheme(Brightness.light),
                  darkTheme: appTheme(Brightness.dark),
                  themeMode: library.themeMode,
                  debugShowCheckedModeBanner: false,
                  home: DetailScreen(api: api, library: library, item: item),
                ),
              ),
            ),
          ),
        ),
      );
      Future<void> waitFor(bool Function() ready) async {
        final deadline = DateTime.now().add(const Duration(seconds: 300));
        while (!ready()) {
          if (DateTime.now().isAfter(deadline)) {
            fail('Real detail sources did not become available.');
          }
          await tester.runAsync(
            () => Future<void>.delayed(const Duration(milliseconds: 250)),
          );
          await tester.pump();
        }
      }

      await waitFor(
        () => find.text('Actualiser les liens').evaluate().isNotEmpty,
      );
      expect(find.text('Sources disponibles'), findsOneWidget);
      // Live providers fluctuate. Provider-specific retention is asserted with
      // fixtures in provider_parity_test; this test verifies actual UI links.
      expect(find.byIcon(Icons.play_circle_fill), findsWidgets);
      expect(tester.getTopLeft(find.byType(SourcesPanel)).dx, greaterThan(600));
      expect(tester.takeException(), isNull);
      Future<void> screenshot(String name) async {
        await tester.pump();
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(capture),
        );
        final image = await boundary.toImage(pixelRatio: 2);
        final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
        final file = File('${Directory.systemTemp.path}/$name.png');
        await file.writeAsBytes(bytes!.buffer.asUint8List());
        image.dispose();
        // Only screenshot paths are logged; signed stream URLs and credentials are never printed.
        debugPrint('DETAIL_SCREENSHOT=${file.path}');
      }

      await screenshot('anisflix-detail-dark');
      await tester.tap(find.widgetWithText(ChoiceChip, 'VO'));
      await tester.pump();
      expect(find.textContaining('— VO'), findsWidgets);
      await library.setThemeMode(ThemeMode.light);
      await tester.pumpAndSettle();
      expect(
        Theme.of(tester.element(find.byType(DetailScreen))).brightness,
        Brightness.light,
      );
      await screenshot('anisflix-detail-light');
      await library.setThemeMode(ThemeMode.dark);
      await tester.pumpWidget(
        Align(
          alignment: Alignment.topLeft,
          child: RepaintBoundary(
            key: capture,
            child: SizedBox(
              width: 960,
              height: 540,
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: appTheme(Brightness.dark),
                home: Scaffold(
                  body: HomeScreen(api: api, library: library, tv: true),
                ),
              ),
            ),
          ),
        ),
      );
      await waitFor(() => find.byType(MediaCard).evaluate().isNotEmpty);
      await screenshot('anisflix-home-categories');
      await tester.scrollUntilVisible(
        find.text('Derniers épisodes'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Derniers épisodes'), findsOneWidget);
      await screenshot('anisflix-home-episodes');
      await tester.scrollUntilVisible(
        find.text('Anime - Séries Populaires'),
        400,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Anime - Séries Populaires'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await screenshot('anisflix-home-anime');
      await tester.pumpWidget(const SizedBox());
      api.close();
    },
  );
  testWidgets('macOS collects live links for a film, an episode and an anime', (
    tester,
  ) async {
    final library = await Library.load();
    final api = CatalogApi(library);
    final report = <String, dynamic>{
      'date': DateTime.now().toUtc().toIso8601String(),
      'engine': 'ios-native',
      'cases': [],
    };
    for (final sample in [
      ('film', 969681, 'movie', null, null),
      ('episode', 1396, 'tv', 1, 1),
      ('anime', 1429, 'tv', 1, 1),
    ]) {
      final metadata = await api.tmdb('/${sample.$3}/${sample.$2}');
      final item = MediaItem.fromJson(metadata, type: sample.$3);

      final links = await api.sources(
        item,
        season: sample.$4,
        episode: sample.$5,
      );
      final counts = <String, int>{};
      for (final link in links) {
        counts.update(link.provider, (n) => n + 1, ifAbsent: () => 1);
      }
      (report['cases'] as List).add({
        'case': sample.$1,
        'tmdbId': sample.$2,
        'links': links.length,
        'providers': counts,
        'providerFailures': 'not exposed by the original iOS engine',
        'lists': {
          for (final language in SourceListPolicy.languages)
            language: [
              for (final source in SourceListPolicy.forLanguage(
                links,
                language,
              ))
                {
                  'provider': source.provider,
                  'quality': source.quality,
                  'language': source.language,
                  'label': SourceListPolicy.display(
                    source,
                    SourceListPolicy.forLanguage(links, language),
                  ),
                },
            ],
        },
      });
      expect(links, isNotEmpty, reason: 'No actual links for ${sample.$1}');
    }
    final file = File(
      '${Directory.systemTemp.path}/anisflix-native-source-audit.json',
    );
    await file.writeAsString(
      const JsonEncoder.withIndent('  ').convert(report),
    );
    debugPrint('SOURCE_AUDIT=${file.path}');
    api.close();
  });
}
