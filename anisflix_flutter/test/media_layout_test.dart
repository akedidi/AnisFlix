import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/widgets/app_display.dart';
import 'package:anisflix_flutter/widgets/media_category_row.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUpAll(() async {
    final loader = FontLoader('Roboto')
      ..addFont(rootBundle.load('assets/fonts/Roboto-Regular.ttf'))
      ..addFont(rootBundle.load('assets/fonts/Roboto-Medium.ttf'));
    await loader.load();
  });

  const items = [
    MediaItem(
      id: 1,
      type: 'movie',
      title: 'Court',
      rating: 8.5,
      date: '2026-01-01',
    ),
    MediaItem(
      id: 2,
      type: 'tv',
      title: 'Un titre de série très long qui occupe plusieurs lignes',
      rating: 7.2,
      date: '2026-01-01',
      latestSeason: 3,
      latestEpisode: 12,
    ),
  ];

  for (final compact in [true, false]) {
    for (final width in [120.0, 145.0, 200.0]) {
      testWidgets(
        'posters keep their full format at $width, compact $compact',
        (tester) async {
          SharedPreferences.setMockInitialValues({});
          final library = await Library.load();
          for (final scale in [1.0, 2.0]) {
            final scaler = TextScaler.linear(scale);
            await tester.pumpWidget(
              MaterialApp(
                theme: appTheme(Brightness.light),
                home: MediaQuery(
                  data: MediaQueryData(textScaler: scaler),
                  child: Scaffold(
                    body: Row(
                      children: [
                        for (final item in items)
                          SizedBox(
                            width: width,
                            height: MediaCard.heightForWidth(
                              width,
                              compact: compact,
                              textScaler: scaler,
                            ),
                            child: MediaCard(
                              item: item,
                              library: library,
                              compact: compact,
                              onTap: () {},
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            );
            await tester.pumpAndSettle();
            final posters = find.byKey(const ValueKey('media-card-poster'));
            for (var index = 0; index < items.length; index++) {
              final size = tester.getSize(posters.at(index));
              expect(size.width, closeTo(width - 6, .01));
              expect(size.width / size.height, closeTo(2 / 3, .001));
            }
            expect(
              tester.getRect(posters.at(0)).top,
              tester.getRect(posters.at(1)).top,
            );
            expect(
              tester.getSize(posters.at(0)),
              tester.getSize(posters.at(1)),
            );
            if (compact) {
              final metadata = tester.renderObject<RenderParagraph>(
                find.descendant(
                  of: find.text('★ 8,5  ·  2026'),
                  matching: find.byType(RichText),
                ),
              );
              expect(metadata.maxLines, 1);
              expect(metadata.didExceedMaxLines, isFalse);
            }
            expect(tester.takeException(), isNull);
          }
        },
      );
    }
  }

  testWidgets('mobile section headings fit a 320px screen at 200 percent', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    await tester.pumpWidget(
      MaterialApp(
        theme: appTheme(Brightness.light),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(2)),
          child: AppDisplay(mobile: true, child: child!),
        ),
        home: Scaffold(
          body: MediaCategoryRow(
            title: 'Derniers épisodes',
            future: Future.value(MediaPage(items, 1, 1)),
            library: library,
            tv: false,
            seeAll: () {},
            retry: () {},
            onSelected: (_) {},
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final title = find.text('Derniers épisodes');
    final paragraph = tester.renderObject<RenderParagraph>(
      find.descendant(of: title, matching: find.byType(RichText)),
    );
    expect(paragraph.textScaler.scale(18), closeTo(21.6, .001));
    expect(tester.getSize(title).height, lessThan(55));
    expect(tester.getSize(find.text('Voir tout')).height, lessThan(22));
    expect(tester.takeException(), isNull);
  });

  testWidgets('mobile typography also reaches pushed routes and dialogs', (
    tester,
  ) async {
    final navigator = GlobalKey<NavigatorState>();
    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigator,
        theme: appTheme(Brightness.light),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(2)),
          child: AppDisplay(mobile: true, child: child!),
        ),
        home: const Scaffold(body: Text('Accueil')),
      ),
    );
    navigator.currentState!.push(
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => showDialog<void>(
              context: context,
              builder: (_) => const AlertDialog(title: Text('Un dialogue')),
            ),
            child: const Text('Ouvrir le dialogue'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final routeContext = tester.element(find.text('Ouvrir le dialogue'));
    expect(Theme.of(routeContext).textTheme.titleLarge?.fontSize, 18);
    expect(MediaQuery.textScalerOf(routeContext).scale(20), closeTo(24, .001));
    await tester.tap(find.text('Ouvrir le dialogue'));
    await tester.pumpAndSettle();
    final dialogContext = tester.element(find.text('Un dialogue'));
    expect(Theme.of(dialogContext).textTheme.titleLarge?.fontSize, 18);
    expect(MediaQuery.textScalerOf(dialogContext).scale(20), closeTo(24, .001));
    expect(tester.takeException(), isNull);
  });
}
