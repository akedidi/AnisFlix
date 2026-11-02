import 'package:anisflix_flutter/models/watch_provider.dart';
import 'package:anisflix_flutter/screens/providers.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('platform catalogues use the same regions as iOS', () async {
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    library.apiKey = 'fixture';
    final requests = <Uri>[];
    final api = CatalogApi(
      library,
      client: MockClient((r) async {
        requests.add(r.url);
        return http.Response('{"results":[]}', 200);
      }),
    );
    addTearDown(api.close);
    for (final provider in watchProviders) {
      for (final type in ['movie', 'tv']) {
        await api.list(type, provider: provider.id);
        expect(
          requests.last.queryParameters['watch_region'],
          [9, 386].contains(provider.id) ? 'US' : 'FR',
        );
      }
    }
  });
  testWidgets(
    '14 square logo tiles open their platform film and series catalogues',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
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
          return http.Response('{"results":[]}', 200);
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProviderDirectoryScreen(
              api: api,
              library: library,
              tv: false,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(watchProviders.length, 14);
      for (final provider in watchProviders) {
        expect(find.text(provider.name), findsOneWidget);
        final image = find.descendant(
          of: find.byKey(ValueKey('provider-${provider.id}')),
          matching: find.byType(Image),
        );
        expect(tester.widget<Image>(image).image, isA<AssetImage>());
        final size = tester.getSize(image);
        expect(size.width, size.height);
      }
      await tester.tap(find.byKey(const ValueKey('provider-147')));
      await tester.pumpAndSettle();
      expect(requests.last.path, '/3/discover/movie');
      expect(requests.last.queryParameters['with_watch_providers'], '147');
      await tester.tap(find.text('Séries'));
      await tester.pumpAndSettle();
      expect(requests.last.path, '/3/discover/tv');
      expect(requests.last.queryParameters['with_watch_providers'], '147');
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('platform grid fits a narrow desktop window', (tester) async {
    tester.view.physicalSize = const Size(480, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final api = CatalogApi(
      library,
      client: MockClient((_) async => http.Response('{"results":[]}', 200)),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ProviderDirectoryScreen(api: api, library: library, tv: false),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(
      find.text('M6+'),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    api.close();
  });
}
