import 'dart:async';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/screens/catalog_categories.dart';
import 'package:anisflix_flutter/screens/home.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/catalog_refresh.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class RefreshCatalog extends CatalogApi {
  final requests = <({String type, bool anime, int? provider, int page})>[];
  Completer<MediaPage>? pending;
  bool fail = false;

  RefreshCatalog(super.library);

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
  }) async {
    requests.add((type: type, anime: anime, provider: provider, page: page));
    if (pending != null) return pending!.future;
    if (fail) throw const ApiFailure('Le service ne répond pas (503).');
    return MediaPage(
      [
        MediaItem(
          id: requests.length,
          type: type,
          title: 'Titre ${requests.length}',
        ),
      ],
      1,
      1,
    );
  }
}

void main() {
  late Library library;
  late RefreshCatalog api;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    api = RefreshCatalog(library);
  });
  tearDown(() => api.close());

  for (final kind in [PointerDeviceKind.touch, PointerDeviceKind.mouse]) {
    testWidgets(
      '$kind keeps content pulled down until the refresh finishes',
      (tester) async {
        final response = Completer<void>();
        var refreshes = 0;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CatalogRefresh(
                onRefresh: () {
                  refreshes++;
                  return response.future;
                },
                slivers: const [SliverToBoxAdapter(child: Text('Content'))],
              ),
            ),
          ),
        );
        final content = find.text('Content');
        final restingY = tester.getTopLeft(content).dy;
        final gesture = await tester.startGesture(
          tester.getCenter(find.byType(CustomScrollView)),
          kind: kind,
        );
        await gesture.moveBy(const Offset(0, 300));
        await tester.pump();
        expect(refreshes, 1);
        expect(tester.getTopLeft(content).dy, greaterThan(restingY + 60));
        await gesture.up();
        await tester.pump();
        await tester.pump(const Duration(seconds: 1));
        expect(tester.getTopLeft(content).dy, closeTo(restingY + 60, 1));
        await tester.pump(const Duration(seconds: 2));
        expect(tester.getTopLeft(content).dy, closeTo(restingY + 60, 1));
        // A second gesture is absorbed while the first request is pending.
        await tester.dragFrom(
          tester.getCenter(find.byType(CatalogRefresh)),
          const Offset(0, 300),
          kind: kind,
        );
        await tester.pump();
        expect(refreshes, 1);
        response.complete();
        await tester.pumpAndSettle();
        expect(tester.getTopLeft(content).dy, closeTo(restingY, 1));
        expect(tester.takeException(), isNull);
      },
      variant: const TargetPlatformVariant({
        TargetPlatform.android,
        TargetPlatform.macOS,
      }),
    );
  }

  testWidgets('a short pull returns without refreshing', (tester) async {
    var refreshes = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CatalogRefresh(
            onRefresh: () async => refreshes++,
            slivers: const [SliverToBoxAdapter(child: Text('Content'))],
          ),
        ),
      ),
    );
    final restingY = tester.getTopLeft(find.text('Content')).dy;
    await tester.drag(find.byType(CustomScrollView), const Offset(0, 60));
    await tester.pumpAndSettle();
    expect(refreshes, 0);
    expect(tester.getTopLeft(find.text('Content')).dy, closeTo(restingY, 1));
  });

  testWidgets('refresh button reveals and holds content after scrolling', (
    tester,
  ) async {
    final scroll = ScrollController();
    addTearDown(scroll.dispose);
    var refreshes = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CatalogRefresh(
            controller: scroll,
            onRefresh: () async => refreshes++,
            slivers: const [
              SliverToBoxAdapter(child: Text('Content')),
              SliverToBoxAdapter(child: SizedBox(height: 1500)),
            ],
          ),
        ),
      ),
    );
    final restingY = tester.getTopLeft(find.text('Content')).dy;
    scroll.jumpTo(400);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Actualiser'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 600));
    expect(refreshes, 1);
    expect(
      tester.getTopLeft(find.text('Content')).dy,
      closeTo(restingY + 60, 1),
    );
    await tester.pump(const Duration(seconds: 2));
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.text('Content')).dy, closeTo(restingY, 1));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  for (final section in [1, 2, 3]) {
    testWidgets(
      'pull refresh reloads section $section and holds feedback for 2s',
      (tester) async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CatalogScreen(
                api: api,
                library: library,
                section: section,
                tv: false,
                initialProvider: section == 3 ? null : 8,
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(api.requests, hasLength(1));
        await tester.drag(find.byType(CustomScrollView), const Offset(0, 600));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        expect(api.requests, hasLength(2));
        expect(api.requests.last.type, section == 1 ? 'movie' : 'tv');
        expect(api.requests.last.anime, section == 3);
        expect(api.requests.last.provider, section == 3 ? null : 8);
        expect(api.requests.last.page, 1);
        expect(find.text('Titre 2'), findsOneWidget);
        expect(
          tester
              .widget<IconButton>(
                find.widgetWithIcon(IconButton, Icons.refresh),
              )
              .onPressed,
          isNull,
        );
        await tester.pump(const Duration(milliseconds: 1500));
        expect(
          tester
              .widget<IconButton>(
                find.widgetWithIcon(IconButton, Icons.refresh),
              )
              .onPressed,
          isNull,
        );
        await tester.pump(const Duration(seconds: 1));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<IconButton>(
                find.widgetWithIcon(IconButton, Icons.refresh),
              )
              .onPressed,
          isNotNull,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  for (final type in ['movie', 'tv']) {
    testWidgets('$type category tab refreshes all rows with a pull gesture', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CatalogCategoriesScreen(
              api: api,
              library: library,
              type: type,
              tv: false,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      final count = api.requests.length;
      expect(count, 8);
      await tester.drag(
        find.byType(CustomScrollView),
        const Offset(0, 600),
        kind: type == 'movie'
            ? PointerDeviceKind.mouse
            : PointerDeviceKind.touch,
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(api.requests, hasLength(count * 2));
      expect(api.requests.every((request) => request.type == type), isTrue);
      await tester.pump(const Duration(seconds: 3));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    });
  }

  testWidgets('home button refreshes all rows and waits for a slow network', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HomeScreen(api: api, library: library, tv: false),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(api.requests, hasLength(homeCategories.length));
    api.pending = Completer<MediaPage>();
    await tester.tap(find.byTooltip('Actualiser'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(api.requests, hasLength(homeCategories.length * 2));
    await tester.pump(const Duration(seconds: 3));
    expect(
      tester
          .widget<IconButton>(find.widgetWithIcon(IconButton, Icons.refresh))
          .onPressed,
      isNull,
    );
    api.pending!.complete(const MediaPage([], 1, 1));
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<IconButton>(find.widgetWithIcon(IconButton, Icons.refresh))
          .onPressed,
      isNotNull,
    );
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('failed refresh keeps cards and retry replaces them', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CatalogScreen(
            api: api,
            library: library,
            section: 1,
            tv: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    api.fail = true;
    await tester.tap(find.byTooltip('Actualiser'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(seconds: 2));
    await tester.pumpAndSettle();
    expect(find.text('Titre 1'), findsOneWidget);
    api.fail = false;
    await tester.ensureVisible(find.text('Réessayer'));
    await tester.tap(find.text('Réessayer'));
    await tester.pumpAndSettle();
    expect(find.text('Titre 1'), findsNothing);
    expect(find.text('Titre 3'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('disposing during a refresh does not update removed state', (
    tester,
  ) async {
    final response = Completer<void>();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CatalogRefresh(
            onRefresh: () => response.future,
            slivers: [
              SliverList.list(children: const [Text('Test')]),
            ],
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('Actualiser'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpWidget(const SizedBox());
    response.complete();
    await tester.pump(const Duration(seconds: 3));
    expect(tester.takeException(), isNull);
  });
}
