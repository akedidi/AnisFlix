import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/home.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FixtureCatalog extends CatalogApi {
  FixtureCatalog(super.library);
  @override
  Future<MediaPage> list(
    String type, {
    int page = 1,
    String query = '',
    bool latest = false,
    bool anime = false,
    int? provider,
  }) async => MediaPage(
    [
      MediaItem(
        id: 1,
        type: type,
        title:
            'Un très long titre qui occupe plusieurs lignes sur un petit écran',
        overview: List.filled(30, 'Un résumé de film détaillé.').join(' '),
      ),
    ],
    1,
    1,
  );
}

void main() {
  for (final size in [
    const Size(320, 640),
    const Size(390, 844),
    const Size(790, 540),
  ]) {
    testWidgets('loaded home fits $size with long titles', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      final api = FixtureCatalog(library);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HomeScreen(api: api, library: library, tv: size.width > 600),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(find.text('Plus d’infos'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      api.close();
    });
  }
}
