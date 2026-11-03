import 'dart:convert';

import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/l10n/native_messages.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/settings.dart';
import 'package:anisflix_flutter/services/app_updates.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  Future<Library> showSettings(
    WidgetTester tester, {
    Size size = const Size(1280, 1200),
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final updates = UpdateController(library.prefs)
      ..installed = const AppVersion(0, 5, 0, 5);
    addTearDown(updates.dispose);
    await tester.pumpWidget(
      ListenableBuilder(
        listenable: library,
        builder: (context, _) => MaterialApp(
          theme: ThemeData.light(),
          darkTheme: ThemeData.dark(),
          themeMode: library.themeMode,
          locale: AppLocalizations.resolve(library.language),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.delegates,
          home: Scaffold(
            body: SettingsScreen(library: library, updates: updates),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return library;
  }

  for (final size in [const Size(390, 844), const Size(1280, 1200)]) {
    testWidgets(
      'iOS settings save appearance, language and subtitles immediately at $size',
      (tester) async {
        final library = await showSettings(tester, size: size);
        expect(find.text('Réglages avancés'), findsNothing);
        expect(find.text('Ouvrir une vidéo'), findsNothing);
        await tester.tap(find.byType(Switch).first);
        await tester.pumpAndSettle();
        expect((await Library.load()).themeMode, ThemeMode.light);
        final increase = find.byTooltip('Augmenter la taille des sous-titres');
        await tester.ensureVisible(increase);
        await tester.tap(increase);
        await tester.pumpAndSettle();
        expect(find.text('110%'), findsOneWidget);
        expect((await Library.load()).subtitleFontSize, closeTo(35.2, .001));
        await tester.ensureVisible(
          find.byType(DropdownButtonFormField<String>),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byType(DropdownButtonFormField<String>));
        await tester.pumpAndSettle();
        for (final language in AppLocalizations.supportedLanguages) {
          expect(find.text('${language.flag} ${language.name}'), findsWidgets);
        }
        await tester.tap(find.text('🇩🇪 Deutsch').last);
        await tester.pumpAndSettle();
        expect(library.language, 'de-DE');
        expect((await Library.load()).language, 'de-DE');
        expect(find.text('Dunkelmodus'), findsOneWidget);
        await tester.ensureVisible(find.text('Nach Updates suchen'));
        expect(find.text('Nach Updates suchen'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }

  testWidgets(
    'clearing progress requires confirmation and preserves favorites and settings',
    (tester) async {
      final library = await showSettings(tester);
      const movie = MediaItem(id: 1, type: 'movie', title: 'Conservé');
      await library.toggleFavorite(movie);
      await library.saveProgress(
        movie,
        null,
        null,
        const Duration(seconds: 40),
        const Duration(seconds: 100),
      );
      await library.setSubtitleFontSize(38.4);
      await tester.pumpAndSettle();
      final clear = find.text('Supprimer la progression');
      await tester.ensureVisible(clear);
      await tester.tap(clear);
      await tester.pumpAndSettle();
      expect(find.text('Supprimer la progression ?'), findsOneWidget);
      await tester.tap(find.text('Annuler'));
      await tester.pumpAndSettle();
      expect((await Library.load()).progress, isNotEmpty);
      await tester.tap(clear);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Supprimer'));
      await tester.pumpAndSettle();
      final restored = await Library.load();
      expect(library.progress, isEmpty);
      expect(restored.progress, isEmpty);
      expect(restored.favorites.keys, ['movie:1']);
      expect(restored.subtitleFontSize, closeTo(38.4, .001));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('canceling cache confirmation leaves watch history intact', (
    tester,
  ) async {
    final library = await showSettings(tester);
    await library.saveProgress(
      const MediaItem(id: 1, type: 'movie', title: 'Film'),
      null,
      null,
      const Duration(seconds: 40),
      const Duration(seconds: 100),
    );
    await tester.ensureVisible(find.text('Vider le cache d’images'));
    await tester.tap(find.text('Vider le cache d’images'));
    await tester.pumpAndSettle();
    expect(find.text('Vider le cache ?'), findsOneWidget);
    await tester.tap(find.text('Annuler'));
    await tester.pumpAndSettle();
    expect((await Library.load()).progress, isNotEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  test(
    'subtitle preference migrates old pixel sizes and matches the iOS range',
    () async {
      SharedPreferences.setMockInitialValues({'subtitleFontSize': 64.0});
      final library = await Library.load();
      expect(library.subtitleFontSize, 48);
      await library.setSubtitleFontSize(16);
      expect((await Library.load()).subtitleFontSize, 16);
      await library.setSubtitleFontSize(35.2);
      expect((await Library.load()).subtitleFontSize, 35.2);
    },
  );

  test(
    'additional native locales retain dynamic values and localize settings',
    () {
      for (final entry in nativeMessages.entries) {
        final l10n = AppLocalizations(Locale(entry.key));
        expect(l10n.text('Paramètres'), isNot('Paramètres'));
        expect(l10n.text('Mode sombre'), isNot('Mode sombre'));
        expect(
          l10n.text('Version installée : {0}', ['0.5.0']),
          contains('0.5.0'),
        );
        for (final row in entry.value.entries) {
          final placeholders = RegExp(r'\{\d+\}');
          expect(
            placeholders.allMatches(row.value).map((m) => m[0]).toSet(),
            placeholders.allMatches(row.key).map((m) => m[0]).toSet(),
            reason: '${entry.key}: ${jsonEncode(row.key)}',
          );
        }
      }
    },
  );
}
