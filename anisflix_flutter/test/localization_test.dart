import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/l10n/messages.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/platform_bridge.dart';
import 'package:anisflix_flutter/widgets/aspect_ratio_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('all translations preserve their placeholders', () {
    Set<String> placeholders(String text) =>
        RegExp(r'\{\d+\}').allMatches(text).map((match) => match[0]!).toSet();
    for (final entry in appMessages.entries) {
      expect(entry.value, hasLength(2), reason: entry.key);
      for (final translation in entry.value) {
        expect(translation.trim(), isNotEmpty, reason: entry.key);
        expect(
          placeholders(translation),
          placeholders(entry.key),
          reason: entry.key,
        );
      }
    }
  });

  test(
    'service messages follow the current language and retain dynamic values',
    () {
      const en = AppLocalizations(Locale('en'));
      const es = AppLocalizations(Locale('es'));
      expect(
        en.message('Le service ne répond pas (503).'),
        'The service is not responding (503).',
      );
      expect(
        es.message('Le service ne répond pas (503).'),
        'El servicio no responde (503).',
      );
      expect(en.text('Piste {0}', ['{0}']), 'Track {0}');
      expect(es.message('Unknown server message'), 'Unknown server message');
      expect(en.decimal(-1.25, digits: 3), '-1.250');
      expect(es.decimal(-1.25, digits: 3), '-1,250');
      expect(AppLocalizations.resolve('en-US'), const Locale('en'));
      expect(AppLocalizations.resolve('de-DE'), const Locale('de'));
      expect(AppLocalizations.resolve('unknown'), const Locale('fr'));
    },
  );

  testWidgets(
    'language picker updates navigation, settings, theme and persists',
    (tester) async {
      tester.view.physicalSize = const Size(1280, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      await tester.pumpWidget(AnisFlixApp(library: library));
      await tester.pump();
      await tester.tap(find.text('🇫🇷'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('🇬🇧 English'));
      await tester.pumpAndSettle();
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Downloads'), findsOneWidget);
      expect(
        find.byTooltip('Search'),
        findsNothing,
      ); // Wide layout has a search field.
      expect(find.text('Latest movies'), findsOneWidget);
      await tester.tap(find.text('Settings'));
      await tester.pumpAndSettle();
      expect(find.text('Language'), findsOneWidget);
      await tester.ensureVisible(find.text('Dark Mode'));
      await tester.tap(find.byType(Switch).first);
      await tester.pumpAndSettle();
      expect(library.themeMode, ThemeMode.light);
      await library.saveSettings(
        language: 'es-ES',
        backend: library.backend,
        apiKey: library.apiKey,
      );
      await tester.pumpAndSettle();
      expect(find.text('Inicio'), findsOneWidget);
      expect(find.text('Apariencia'), findsOneWidget);
      await tester.ensureVisible(find.text('Buscar actualizaciones'));
      expect(find.text('Buscar actualizaciones'), findsOneWidget);
      expect((await Library.load()).language, 'es-ES');
      expect(PlatformBridge.language, 'es-ES');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('aspect menu translates and supports keyboard selection', (
    tester,
  ) async {
    final mode = ValueNotifier(VideoAspectMode.original);
    final visible = ValueNotifier(true);
    addTearDown(mode.dispose);
    addTearDown(visible.dispose);
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('es'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.delegates,
        home: Scaffold(
          body: ValueListenableBuilder(
            valueListenable: visible,
            builder: (context, show, _) => show
                ? AspectRatioButton(
                    mode: mode,
                    onSelected: (value) => mode.value = value,
                  )
                : const SizedBox(),
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('Relación de aspecto'));
    await tester.pumpAndSettle();
    expect(find.text('Original'), findsOneWidget);
    expect(find.text('16:9'), findsOneWidget);
    expect(find.text('4:3'), findsOneWidget);
    expect(find.text('Estirado'), findsOneWidget);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
    await tester.sendKeyEvent(LogicalKeyboardKey.enter);
    await tester.pumpAndSettle();
    expect(mode.value, VideoAspectMode.widescreen);
    await tester.tap(find.byTooltip('Relación de aspecto'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.widgetWithText(CheckedPopupMenuItem<VideoAspectMode>, '4:3'),
    );
    await tester.pumpAndSettle();
    expect(mode.value, VideoAspectMode.standard);
    await tester.tap(find.byTooltip('Relación de aspecto'));
    await tester.pumpAndSettle();
    visible.value = false; // Playback controls hide while the menu is open.
    await tester.pump();
    await tester.tap(
      find.widgetWithText(CheckedPopupMenuItem<VideoAspectMode>, 'Estirado'),
    );
    await tester.pumpAndSettle();
    expect(mode.value, VideoAspectMode.stretched);
  });
}
