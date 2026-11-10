import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/widgets/mobile_navigation_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUpAll(() async {
    final loader = FontLoader('Roboto')
      ..addFont(rootBundle.load('assets/fonts/Roboto-Regular.ttf'))
      ..addFont(rootBundle.load('assets/fonts/Roboto-Medium.ttf'));
    await loader.load();
  });

  for (final width in [320.0, 390.0, 600.0]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'mobile menu stays on one line at $width, text scale $scale',
        (tester) async {
          tester.view.physicalSize = Size(width, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          var selected = 0;
          await tester.pumpWidget(
            MaterialApp(
              theme: appTheme(Brightness.light),
              home: MediaQuery(
                data: MediaQueryData(
                  size: Size(width, 844),
                  textScaler: TextScaler.linear(scale),
                ),
                child: StatefulBuilder(
                  builder: (context, setState) => Scaffold(
                    bottomNavigationBar: MobileNavigationBar(
                      selectedIndex: selected,
                      onDestinationSelected: (index) =>
                          setState(() => selected = index),
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          for (final label in [
            'Accueil',
            'Explorer',
            'Téléch.',
            'Favoris',
            'Paramètres',
          ]) {
            final paragraph = tester.renderObject<RenderParagraph>(
              find.descendant(
                of: find.text(label),
                matching: find.byType(RichText),
              ),
            );
            expect(paragraph.maxLines, 1, reason: label);
            expect(paragraph.softWrap, isFalse, reason: label);
            expect(paragraph.didExceedMaxLines, isFalse, reason: label);
          }
          await tester.tap(find.text('Paramètres'));
          await tester.pumpAndSettle();
          expect(selected, 4);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
