import 'dart:async';
import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

http.Response response(int page, {int count = 20, int pages = 2}) =>
    http.Response(
      jsonEncode({
        'page': page,
        'total_pages': pages,
        'results': [
          for (var i = 1; i <= count; i++)
            {
              'id': (page - 1) * count + i,
              'title': 'Titre ${(page - 1) * count + i}',
            },
        ],
      }),
      200,
    );

Future<Library> fixtureLibrary() async {
  SharedPreferences.setMockInitialValues({});
  return await Library.load()
    ..apiKey = 'fixture';
}

Widget catalog(
  CatalogApi api,
  Library library, {
  int section = 1,
  bool tv = false,
}) => MaterialApp(
  home: Scaffold(
    body: CatalogScreen(api: api, library: library, section: section, tv: tv),
  ),
);

ScrollController controller(WidgetTester tester) =>
    tester.widget<CustomScrollView>(find.byType(CustomScrollView)).controller!;

Future<void> bottom(WidgetTester tester) async {
  final scroll = controller(tester);
  scroll.jumpTo(scroll.position.maxScrollExtent);
  await tester.pump();
}

void main() {
  testWidgets('TV search suggests movies and series until a query is entered', (
    tester,
  ) async {
    final library = await fixtureLibrary();
    final api = CatalogApi(
      library,
      client: MockClient((request) async {
        final item = switch (request.url.path) {
          '/3/discover/movie' => {'id': 1, 'title': 'Film suggéré'},
          '/3/discover/tv' => {'id': 1, 'name': 'Série suggérée'},
          '/3/search/multi' => {
            'id': 2,
            'title': 'Résultat ciblé',
            'media_type': 'movie',
          },
          _ => throw StateError('Unexpected catalogue request'),
        };
        return http.Response(
          jsonEncode({
            'results': [item],
          }),
          200,
        );
      }),
    );
    addTearDown(api.close);
    await tester.pumpWidget(catalog(api, library, section: 4, tv: true));
    await tester.pumpAndSettle();
    expect(find.text('Film suggéré'), findsOneWidget);
    expect(find.text('Série suggérée'), findsOneWidget);

    await tester.tap(find.text('a'));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();
    expect(find.text('Film suggéré'), findsNothing);
    expect(find.text('Résultat ciblé'), findsOneWidget);

    await tester.tap(find.byTooltip('Effacer'));
    await tester.pumpAndSettle();
    expect(find.text('Film suggéré'), findsOneWidget);
    expect(find.text('Série suggérée'), findsOneWidget);
    expect(find.text('Résultat ciblé'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });

  for (final section in [1, 2]) {
    testWidgets(
      'section $section automatically appends once and stops on the final page',
      (tester) async {
        final library = await fixtureLibrary();
        final requests = <Uri>[];
        final next = Completer<http.Response>();
        final api = CatalogApi(
          library,
          client: MockClient((request) async {
            requests.add(request.url);
            return request.url.queryParameters['page'] == '2'
                ? next.future
                : response(1);
          }),
        );
        addTearDown(api.close);
        await tester.pumpWidget(catalog(api, library, section: section));
        await tester.pumpAndSettle();
        expect(requests, hasLength(1));
        expect(find.text('Voir plus'), findsNothing);
        await bottom(tester);
        await tester.pump();
        expect(requests, hasLength(2));
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
        await bottom(tester);
        await tester.pump(const Duration(milliseconds: 200));
        expect(
          requests,
          hasLength(2),
          reason: 'Only one page request may be in flight.',
        );
        next.complete(response(2));
        await tester.pumpAndSettle();
        await bottom(tester);
        await tester.pumpAndSettle();
        expect(find.text('Titre 40'), findsOneWidget);
        expect(requests.map((r) => r.queryParameters['page']), ['1', '2']);
        expect(requests.map((r) => r.path).toSet(), {
          '/3/discover/${section == 1 ? 'movie' : 'tv'}',
        });
        controller(tester).jumpTo(0);
        await tester.pumpAndSettle();
        expect(
          find.text('Titre 1'),
          findsOneWidget,
          reason: 'Earlier results stay in the catalogue.',
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'short pages automatically fill the viewport until the final page',
    (tester) async {
      final library = await fixtureLibrary();
      final requests = <int>[];
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          final page = int.parse(request.url.queryParameters['page']!);
          requests.add(page);
          return response(page, count: 1, pages: 3);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(catalog(api, library));
      await tester.pumpAndSettle();
      expect(requests, [1, 2, 3]);
      expect(find.byType(MediaCard), findsNWidgets(3));
      expect(find.text('Voir plus'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'pagination errors retain results and retry the same page on request',
    (tester) async {
      final library = await fixtureLibrary();
      final requests = <int>[];
      var failed = false;
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          final page = int.parse(request.url.queryParameters['page']!);
          requests.add(page);
          if (page == 2 && !failed) {
            failed = true;
            return http.Response('{}', 503);
          }
          return response(page);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(catalog(api, library));
      await tester.pumpAndSettle();
      await bottom(tester);
      await tester.pumpAndSettle();
      expect(requests, [1, 2]);
      await bottom(tester);
      await tester.pumpAndSettle();
      expect(requests, [
        1,
        2,
      ], reason: 'Scrolling must not repeatedly retry failures.');
      expect(find.text('Titre 20'), findsOneWidget);
      await tester.ensureVisible(find.text('Réessayer'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();
      await bottom(tester);
      await tester.pumpAndSettle();
      expect(requests, [1, 2, 2]);
      expect(find.text('Titre 40'), findsOneWidget);
      expect(find.text('Réessayer'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'empty catalogues and local favourites never request another page',
    (tester) async {
      final library = await fixtureLibrary();
      final requests = <int>[];
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          final page = int.parse(request.url.queryParameters['page']!);
          requests.add(page);
          return response(page, count: 0, pages: 20);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(catalog(api, library));
      await tester.pumpAndSettle();
      expect(requests, [1]);
      expect(find.text('Aucun titre à afficher.'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      library.favorites['movie:1'] = const MediaItem(
        id: 1,
        type: 'movie',
        title: 'Favori',
      );
      await tester.pumpWidget(catalog(api, library, section: 5));
      await tester.pumpAndSettle();
      await bottom(tester);
      await tester.pumpAndSettle();
      expect(requests, [1]);
      expect(find.text('Favori'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
