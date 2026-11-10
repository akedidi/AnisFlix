import 'dart:convert';

import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/models/catalog_category.dart';
import 'package:anisflix_flutter/models/watch_provider.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/screens/providers.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/media_category_row.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

http.Response pageResponse(Uri uri, {bool empty = false}) {
  final page = int.parse(uri.queryParameters['page']!);
  final type = uri.path.split('/').last;
  return http.Response(
    jsonEncode({
      'page': page,
      'total_pages': 2,
      'results': [
        if (!empty)
          for (var i = 1; i <= 20; i++)
            {
              'id': (page - 1) * 20 + i,
              'title': '$type ${(page - 1) * 20 + i}',
              'name': '$type ${(page - 1) * 20 + i}',
              'release_date': '2025-12-${i.toString().padLeft(2, '0')}',
              'first_air_date': '2025-12-${i.toString().padLeft(2, '0')}',
            },
      ],
    }),
    200,
  );
}

Widget providerApp(CatalogApi api, Library library, {bool tv = false}) =>
    MaterialApp(
      locale: AppLocalizations.resolve(library.language),
      localizationsDelegates: AppLocalizations.delegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: ProviderCatalogScreen(
        api: api,
        library: library,
        tv: tv,
        provider: const WatchProvider(9, 'Amazon Prime'),
      ),
    );

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets(
    'each native category previews ten titles and keeps its query through pagination',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      for (final category in providerCategories) {
        final library = await Library.load()
          ..apiKey = 'fixture';
        final requests = <Uri>[];
        final api = CatalogApi(
          library,
          client: MockClient((request) async {
            requests.add(request.url);
            return pageResponse(request.url);
          }),
        );
        await tester.pumpWidget(providerApp(api, library, tv: true));
        await tester.pumpAndSettle();
        final row = find.byKey(
          ValueKey(
            'provider-category-9-${category.type}-${category.genre ?? 'all'}',
          ),
        );
        await tester.scrollUntilVisible(
          row,
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        final preview = await tester
            .widget<MediaCategoryRow>(
              find.descendant(of: row, matching: find.byType(MediaCategoryRow)),
            )
            .future;
        expect(
          preview.items.map((item) => item.id),
          List.generate(10, (i) => 20 - i),
        );
        expect(requests, hasLength(8));
        await tester.tap(
          find.descendant(of: row, matching: find.text('Voir tout')),
        );
        await tester.pumpAndSettle();
        expect(find.text('Amazon Prime - ${category.title}'), findsOneWidget);
        expect(find.byType(DropdownButton<int?>), findsNothing);
        final firstPage = requests.last;
        final scroll = tester
            .widget<CustomScrollView>(find.byType(CustomScrollView))
            .controller!;
        scroll.jumpTo(scroll.position.maxScrollExtent);
        await tester.pumpAndSettle();
        expect(requests, hasLength(10));
        expect(requests.last.path, '/3/discover/${category.type}');
        expect(requests.last.queryParameters, {
          ...firstPage.queryParameters,
          'page': '2',
        });
        expect(requests.last.queryParameters['with_watch_providers'], '9');
        expect(requests.last.queryParameters['watch_region'], 'US');
        expect(
          requests.last.queryParameters['with_genres'],
          category.genre?.toString(),
        );
        expect(find.byType(MediaCard), findsWidgets);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        api.close();
      }
    },
  );

  testWidgets(
    'empty rows stay hidden and a failed category retries independently',
    (tester) async {
      final library = await Library.load()
        ..apiKey = 'fixture';
      final requests = <Uri>[];
      var failSeries = true;
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          requests.add(request.url);
          if (request.url.path.endsWith('/tv') &&
              request.url.queryParameters['with_genres'] == null &&
              failSeries) {
            failSeries = false;
            return http.Response('{}', 503);
          }
          return pageResponse(
            request.url,
            empty: request.url.path.endsWith('/movie'),
          );
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(providerApp(api, library));
      await tester.pumpAndSettle();
      expect(find.text('Films'), findsNothing);
      expect(find.text('Réessayer'), findsOneWidget);
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();
      expect(requests, hasLength(9));
      expect(requests.last.path, '/3/discover/tv');
      expect(requests.last.queryParameters['with_watch_providers'], '9');
      expect(requests.last.queryParameters['with_genres'], isNull);
      expect(find.text('Réessayer'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('a language change refreshes every category in a narrow layout', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final library = await Library.load()
      ..apiKey = 'fixture';
    final requests = <Uri>[];
    final api = CatalogApi(
      library,
      client: MockClient((request) async {
        requests.add(request.url);
        return pageResponse(request.url);
      }),
    );
    addTearDown(api.close);
    await tester.pumpWidget(providerApp(api, library));
    await tester.pumpAndSettle();
    library.language = 'en-US';
    await tester.pumpWidget(providerApp(api, library));
    await tester.pumpAndSettle();
    expect(requests, hasLength(16));
    expect(
      requests
          .skip(8)
          .every((request) => request.queryParameters['language'] == 'en-US'),
      isTrue,
    );
    for (final category in providerCategories) {
      final title = find.text(
        const AppLocalizations(Locale('en')).text(category.title),
      );
      await tester.scrollUntilVisible(
        title,
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(title, findsOneWidget);
      expect(tester.takeException(), isNull);
    }
    await tester.pumpWidget(const SizedBox());
  });
}
