import 'dart:async';
import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/search_box.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets(
    'autocomplete rejects late results, selects with arrows and clears',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      library.apiKey = 'fixture';
      final slow = Completer<http.Response>();
      final calls = <String>[];
      final api = CatalogApi(
        library,
        client: MockClient((r) async {
          final query = r.url.queryParameters['query']!;
          calls.add(query);
          if (query == 'old') return slow.future;
          return http.Response(
            jsonEncode({
              'results': [
                {'id': 1, 'title': 'New One', 'media_type': 'movie'},
                {'id': 2, 'title': 'New Two', 'media_type': 'movie'},
              ],
            }),
            200,
          );
        }),
      );
      MediaItem? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SearchBox(
              api: api,
              onSelected: (i) => selected = i,
              onSubmitted: (_) {},
            ),
          ),
        ),
      );
      await tester.enterText(find.byType(TextField), 'old');
      await tester.pump(const Duration(milliseconds: 310));
      expect(calls, ['old']);
      await tester.enterText(find.byType(TextField), 'new');
      await tester.pump(const Duration(milliseconds: 310));
      await tester.pumpAndSettle();
      slow.complete(
        http.Response(
          '{"results":[{"id":9,"title":"Stale","media_type":"movie"}]}',
          200,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Stale'), findsNothing);
      expect(find.text('New One'), findsOneWidget);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pumpAndSettle();
      expect(selected?.id, 2);
      await tester.tap(find.byTooltip('Effacer la recherche'));
      await tester.pumpAndSettle();
      expect(find.text('New One'), findsNothing);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        isEmpty,
      );
      api.close();
    },
  );
}
