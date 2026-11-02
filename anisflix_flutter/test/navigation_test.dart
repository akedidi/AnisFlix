import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('D-pad down and select open the next sidebar destination', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1280, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    await tester.pumpWidget(AnisFlixApp(library: library));
    await tester.pump();
    expect(find.byType(CatalogScreen), findsNothing);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.select);
    await tester.pump();
    expect(find.byType(CatalogScreen), findsOneWidget);
    expect(tester.widget<CatalogScreen>(find.byType(CatalogScreen)).section, 1);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  for (final size in [
    const Size(390, 844),
    const Size(1280, 720),
    const Size(1920, 1080),
  ]) {
    testWidgets('navigation remains usable at $size', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      await library.toggleFavorite(
        const MediaItem(id: 1, type: 'movie', title: 'Film conservé'),
      );
      await tester.pumpWidget(AnisFlixApp(library: library));
      await tester.pump();
      if (size.width < 900 && !const bool.fromEnvironment('TV_MODE')) {
        await tester.tap(find.text('Plus'));
        await tester.pumpAndSettle();
      }
      await tester.tap(find.text('Favoris'));
      await tester.pumpAndSettle();
      expect(find.text('Film conservé'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.pump();
      expect(FocusManager.instance.primaryFocus, isNotNull);
      await tester.pumpWidget(const SizedBox());
    });
  }
}
