import 'dart:convert';

import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/services/app_updates.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets(
    'anime menu sorts both types by newest release across pages without a platform filter',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      library.apiKey = 'fixture';
      final updates = UpdateController(library.prefs);
      addTearDown(updates.dispose);
      final requests = <Uri>[];
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final api = CatalogApi(
        library,
        client: MockClient((request) async {
          requests.add(request.url);
          final page = int.parse(request.url.queryParameters['page'] ?? '1');
          return http.Response(
            jsonEncode({
              'page': page,
              'total_pages': 2,
              'results': [
                for (var i = 1; i <= 20; i++)
                  {
                    'id': (page - 1) * 20 + i,
                    'title': 'Animé ${(page - 1) * 20 + i}',
                    'name': 'Animé ${(page - 1) * 20 + i}',
                    'release_date': today,
                    'first_air_date': today,
                  },
              ],
            }),
            200,
          );
        }),
      );
      addTearDown(api.close);
      await tester.pumpWidget(
        MaterialApp(
          home: Shell(api: api, library: library, updates: updates),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Animés'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<CatalogScreen>(find.byType(CatalogScreen)).latestOverride,
        isTrue,
      );

      void expectNewest(String type, {int page = 1}) {
        final request = requests.last;
        final date = type == 'tv' ? 'first_air_date' : 'primary_release_date';
        expect(request.path, '/3/discover/$type');
        expect(request.queryParameters['sort_by'], '$date.desc');
        expect(request.queryParameters['$date.lte'], today);
        expect(request.queryParameters['with_genres'], '16');
        expect(request.queryParameters['with_original_language'], 'ja');
        expect(request.queryParameters['page'], '$page');
        expect(request.queryParameters['with_watch_providers'], isNull);
      }

      for (final type in ['tv', 'movie']) {
        if (type == 'movie') {
          await tester.tap(
            find.descendant(
              of: find.byType(SegmentedButton<String>),
              matching: find.text('Films'),
            ),
          );
          await tester.pumpAndSettle();
        }
        expectNewest(type);
        expect(find.byType(DropdownButton<int?>), findsNothing);
        expect(find.text('Toutes les plateformes'), findsNothing);
        final scroll = tester
            .widget<CustomScrollView>(find.byType(CustomScrollView))
            .controller!;
        scroll.jumpTo(scroll.position.maxScrollExtent);
        await tester.pumpAndSettle();
        expectNewest(type, page: 2);
        scroll.jumpTo(scroll.position.maxScrollExtent);
        await tester.pumpAndSettle();
        expect(find.text('Animé 40'), findsOneWidget);
        scroll.jumpTo(0);
        await tester.pumpAndSettle();
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
