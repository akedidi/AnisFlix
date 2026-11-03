import 'dart:convert';

import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/models/catalog_category.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/screens/catalog_categories.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<Library> fixtureLibrary() async {
  SharedPreferences.setMockInitialValues({});
  final library = await Library.load();
  library.apiKey = 'fixture';
  return library;
}

http.Response pageResponse(Uri uri, {int count = 1}) => http.Response(
  jsonEncode({
    'page': int.parse(uri.queryParameters['page'] ?? '1'),
    'total_pages': 2,
    'results': [
      for (var i = 1; i <= count; i++)
        MediaItem(
          id: (int.parse(uri.queryParameters['page'] ?? '1') - 1) * count + i,
          type: uri.path.endsWith('/tv') ? 'tv' : 'movie',
          title:
              'Titre ${(int.parse(uri.queryParameters['page'] ?? '1') - 1) * count + i}',
        ).toJson(),
    ],
  }),
  200,
);

Widget categoriesApp(
  CatalogApi api,
  Library library,
  String type, {
  bool tv = true,
  String language = 'fr',
}) => MaterialApp(
  locale: Locale(language),
  supportedLocales: AppLocalizations.supportedLocales,
  localizationsDelegates: AppLocalizations.delegates,
  home: Scaffold(
    body: CatalogCategoriesScreen(
      api: api,
      library: library,
      type: type,
      tv: tv,
    ),
  ),
);

void main() {
  for (final type in ['movie', 'tv']) {
    testWidgets('$type loads all TV categories in order with their genres', (
      tester,
    ) async {
      final library = await fixtureLibrary();
      final requests = <Uri>[];
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          requests.add(r.url);
          return pageResponse(r.url);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(categoriesApp(api, library, type));
      await tester.pumpAndSettle();
      expect(requests, hasLength(8));
      expect(requests.first.path, '/api/tmdb-proxy');
      expect(
        requests.first.queryParameters['type'],
        type == 'tv' ? 'series' : 'movie',
      );
      expect(requests.first.queryParameters['filter'], 'last');
      final genres = type == 'tv'
          ? [10759, 18, 80, 9648, 99, 10765, 16]
          : [28, 18, 80, 9648, 99, 878, 16];
      expect(requests.skip(1).map((r) => r.path).toSet(), {
        '/3/discover/$type',
      });
      expect(
        requests.skip(1).map((r) => r.queryParameters['with_genres']),
        genres.map((genre) => '$genre'),
      );
      expect(
        requests.any(
          (r) => r.queryParameters.containsKey('with_original_language'),
        ),
        isFalse,
      );
      final categories = type == 'tv' ? seriesCategories : movieCategories;
      for (final category in categories) {
        final row = find.byKey(
          ValueKey('catalog-category-$type-${category.genre ?? 'latest'}'),
        );
        await tester.scrollUntilVisible(
          row,
          250,
          scrollable: find.byType(Scrollable).first,
        );
        expect(
          find.descendant(of: row, matching: find.text(category.title)),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      }
      expect(
        requests,
        hasLength(8),
        reason: 'Scrolling must reuse loaded rows.',
      );
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets(
    'genre grid retains series genre across pagination without extra controls',
    (tester) async {
      final library = await fixtureLibrary();
      final requests = <Uri>[];
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          requests.add(r.url);
          return pageResponse(r.url, count: 20);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(categoriesApp(api, library, 'tv'));
      await tester.pumpAndSettle();
      final row = find.byKey(const ValueKey('catalog-category-tv-10765'));
      await tester.scrollUntilVisible(
        row,
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(
        find.descendant(of: row, matching: find.text('Voir tout')),
      );
      await tester.pumpAndSettle();
      expect(
        tester.widget<CatalogScreen>(find.byType(CatalogScreen)).initialGenre,
        10765,
      );
      expect(find.text('Science-fiction'), findsOneWidget);
      expect(find.text('Séries'), findsNothing);
      expect(find.byType(DropdownButton<int?>), findsNothing);
      expect(requests.last.path, '/3/discover/tv');
      expect(requests.last.queryParameters['with_genres'], '10765');
      final gridScroll = find
          .descendant(
            of: find.byType(CatalogScreen),
            matching: find.byType(Scrollable),
          )
          .first;
      expect(find.text('Voir plus'), findsNothing);
      await tester.drag(gridScroll, const Offset(0, -4000));
      await tester.pumpAndSettle();
      expect(requests.last.queryParameters['page'], '2');
      expect(requests.last.queryParameters['with_genres'], '10765');
      tester
          .widget<CustomScrollView>(
            find.descendant(
              of: find.byType(CatalogScreen),
              matching: find.byType(CustomScrollView),
            ),
          )
          .controller!
          .jumpTo(0);
      await tester.pumpAndSettle();
      expect(requests.last.path, '/3/discover/tv');
      expect(requests.last.queryParameters['with_genres'], '10765');
      expect(requests.last.queryParameters['with_watch_providers'], isNull);
      expect(requests.last.queryParameters['page'], '2');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('latest see all uses the latest movie catalogue', (tester) async {
    final library = await fixtureLibrary();
    final requests = <Uri>[];
    final api = CatalogApi(
      library,
      client: MockClient((r) async {
        requests.add(r.url);
        return pageResponse(r.url);
      }),
    );
    addTearDown(api.close);
    await tester.pumpWidget(categoriesApp(api, library, 'movie'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Voir tout').first);
    await tester.pumpAndSettle();
    expect(requests.last.path, '/api/tmdb-proxy');
    expect(requests.last.queryParameters['filter'], 'last');
    expect(requests.last.queryParameters['type'], 'movie');
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'a failed offscreen row can retry without reloading other categories',
    (tester) async {
      final library = await fixtureLibrary();
      final requests = <Uri>[];
      var failed = false;
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          requests.add(r.url);
          if (r.url.queryParameters['with_genres'] == '99' && !failed) {
            failed = true;
            return http.Response('{}', 503);
          }
          return pageResponse(r.url);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(categoriesApp(api, library, 'movie'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.scrollUntilVisible(
        find.text('Réessayer'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Réessayer'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();
      expect(requests, hasLength(9));
      expect(requests.last.queryParameters['with_genres'], '99');
      expect(find.text('Réessayer'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  for (final language in ['en', 'es']) {
    testWidgets('categories translate and fit a narrow screen in $language', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final library = await fixtureLibrary();
      library.language = '$language-${language == 'en' ? 'US' : 'ES'}';
      final api = CatalogApi(
        library,
        client: MockClient((r) async => pageResponse(r.url)),
      );
      addTearDown(api.close);
      await tester.pumpWidget(
        categoriesApp(api, library, 'tv', tv: false, language: language),
      );
      await tester.pumpAndSettle();
      final l10n = AppLocalizations(Locale(language));
      for (final category in seriesCategories) {
        final title = find.text(l10n.text(category.title));
        await tester.scrollUntilVisible(
          title,
          250,
          scrollable: find.byType(Scrollable).first,
        );
        expect(title, findsOneWidget);
        expect(tester.takeException(), isNull);
      }
      expect(
        find.text(language == 'en' ? 'Animation' : 'Animación'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox());
    });
  }
}
