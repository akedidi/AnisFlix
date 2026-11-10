import 'dart:async';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/widgets/subtitle_settings.dart';
import 'package:anisflix_flutter/widgets/subtitle_size_control.dart';
import 'package:anisflix_flutter/widgets/player_settings_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:media_kit/media_kit.dart';

class _Streams extends Fake implements PlayerStream {
  final selection = StreamController<Track>.broadcast();
  @override
  Stream<Track> get track => selection.stream;
  @override
  Stream<Tracks> get tracks => const Stream.empty();
}

class _Player extends Fake implements Player {
  @override
  final _Streams streams = _Streams();
  Track selected = Track();
  final List<SubtitleTrack> available;
  _Player([this.available = const []]);
  @override
  PlayerState get state => PlayerState(
    track: selected,
    tracks: Tracks(
      subtitle: [SubtitleTrack.no(), SubtitleTrack.auto(), ...available],
    ),
  );
  @override
  PlayerStream get stream => streams;
  @override
  Future<void> setSubtitleTrack(SubtitleTrack track) async {
    selected = selected.copyWith(subtitle: track);
    streams.selection.add(selected);
  }
}

void main() {
  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(finder);
  }

  Future<void> showPanel(
    WidgetTester tester,
    _Player player, {
    List<SourceSubtitle> external = const [],
    Future<void> Function(int)? changeDelay,
    Future<void> Function(double)? changeSize,
    Future<List<SourceSubtitle>> Function()? loadOpenSubtitles,
    String language = 'fr',
    bool releaseStyle = false,
  }) async {
    addTearDown(player.streams.selection.close);
    await tester.pumpWidget(
      MaterialApp(
        locale: Locale(language),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.delegates,
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showDialog<void>(
                context: context,
                builder: (_) => SubtitleSettingsDialog(
                  releaseStyle: releaseStyle,
                  player: player,
                  externalTracks: external,
                  loadOpenSubtitles: loadOpenSubtitles,
                  delayMilliseconds: 0,
                  fontSize: 32,
                  onDelayChanged: changeDelay ?? (_) async {},
                  onFontSizeChanged: changeSize ?? (_) async {},
                ),
              ),
              child: const Text('Ouvrir'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Ouvrir'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
  }

  testWidgets('Release subtitles show disabled until a track is selected', (
    tester,
  ) async {
    final player = _Player();
    await showPanel(
      tester,
      player,
      releaseStyle: true,
      external: const [
        SourceSubtitle('https://example.org/fr.vtt', 'Français', 'fr'),
      ],
    );
    PlayerSettingOption option(String label) =>
        tester.widget<PlayerSettingOption>(
          find
              .ancestor(
                of: find.text(label),
                matching: find.byType(PlayerSettingOption),
              )
              .first,
        );
    expect(option('Sous-titres désactivés').selected, isTrue);
    await tapVisible(tester, find.text('Français · Fournisseur'));
    await tester.pumpAndSettle();
    expect(option('Français · Fournisseur').selected, isTrue);
    expect(option('Sous-titres désactivés').selected, isFalse);
    await tapVisible(tester, find.text('Sous-titres désactivés'));
    await tester.pumpAndSettle();
    expect(option('Sous-titres désactivés').selected, isTrue);
    expect(player.selected.subtitle.id, 'no');
  });

  testWidgets('provider tracks remain selectable during external discovery', (
    tester,
  ) async {
    final pending = Completer<List<SourceSubtitle>>();
    final player = _Player([const SubtitleTrack('1', 'Embarqués', 'fr')]);
    await showPanel(
      tester,
      player,
      external: const [
        SourceSubtitle('https://example.com/provider.vtt', 'Français', 'fr'),
      ],
      loadOpenSubtitles: () => pending.future,
    );
    expect(find.text('Recherche sur OpenSubtitles…'), findsOneWidget);
    expect(find.text('Aucune piste de sous-titres disponible.'), findsNothing);
    await tapVisible(tester, find.text('Français · Fournisseur'));
    await tester.pump();
    expect(player.selected.subtitle.id, 'https://example.com/provider.vtt');
    pending.complete(const [
      SourceSubtitle('https://example.com/provider.vtt', 'Français', 'fre'),
      SourceSubtitle('https://example.com/fr1.vtt', 'Français', 'fre'),
      SourceSubtitle('https://example.com/fr2.vtt', 'Français', 'fre'),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('Recherche sur OpenSubtitles…'), findsNothing);
    expect(find.text('🇫🇷 Français #1 · OpenSubtitles'), findsOneWidget);
    expect(find.text('🇫🇷 Français #2 · OpenSubtitles'), findsOneWidget);
    expect(find.text('🇫🇷 Français #3 · OpenSubtitles'), findsNothing);
    expect(player.selected.subtitle.id, 'https://example.com/provider.vtt');
    await tester.ensureVisible(find.text('🇫🇷 Français #2 · OpenSubtitles'));
    await tester.tap(find.text('🇫🇷 Français #2 · OpenSubtitles'));
    await tester.pumpAndSettle();
    expect(player.selected.subtitle.id, 'https://example.com/fr2.vtt');
    expect(player.selected.subtitle.uri, isTrue);
  });

  testWidgets('failed discovery can retry without resetting the chosen track', (
    tester,
  ) async {
    var attempts = 0;
    const embedded = SubtitleTrack('1', 'Embarqués', 'fr');
    final player = _Player([embedded]);
    await showPanel(
      tester,
      player,
      loadOpenSubtitles: () async {
        if (++attempts == 1) throw StateError('offline');
        return const [
          SourceSubtitle('https://example.com/fr.vtt', 'Français', 'fre'),
        ];
      },
    );
    await tester.pumpAndSettle();
    expect(find.text('Recherche de sous-titres indisponible.'), findsOneWidget);
    await tapVisible(tester, find.text('Embarqués'));
    await tester.pumpAndSettle();
    await tapVisible(tester, find.text('Réessayer'));
    await tester.pumpAndSettle();
    expect(attempts, 2);
    expect(find.text('🇫🇷 Français · OpenSubtitles'), findsOneWidget);
    expect(find.text('Recherche de sous-titres indisponible.'), findsNothing);
    expect(player.selected.subtitle, embedded);
  });

  testWidgets(
    'closing the menu during discovery safely ignores late completion',
    (tester) async {
      final pending = Completer<List<SourceSubtitle>>();
      await showPanel(
        tester,
        _Player(),
        loadOpenSubtitles: () => pending.future,
      );
      await tester.tap(find.text('Fermer'));
      await tester.pumpAndSettle();
      pending.complete(const [
        SourceSubtitle('https://example.com/fr.vtt', 'Français', 'fre'),
      ]);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  for (final locale in ['en', 'es']) {
    testWidgets('subtitle timing and validation are localized in $locale', (
      tester,
    ) async {
      final applied = <int>[];
      await showPanel(
        tester,
        _Player(),
        language: locale,
        changeDelay: (value) async => applied.add(value),
      );
      final english = locale == 'en';
      expect(find.text(english ? 'Subtitles' : 'Subtítulos'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '1.25');
      await tester.tap(find.text(english ? 'Apply' : 'Aplicar'));
      await tester.pumpAndSettle();
      expect(applied, [1250]);
      expect(
        find.text(
          english ? 'Applied offset: 1.250 s' : 'Desfase aplicado: 1,250 s',
        ),
        findsOneWidget,
      );
      await tester.enterText(find.byType(TextField), '601');
      await tester.tap(find.text(english ? 'Apply' : 'Aplicar'));
      await tester.pumpAndSettle();
      expect(
        find.text(
          english
              ? 'Enter an offset between −600 and 600 seconds.'
              : 'Introduce un desfase entre −600 y 600 segundos.',
        ),
        findsOneWidget,
      );
      expect(applied, [1250]);
    });
  }

  testWidgets('subtitle settings remain available without provider tracks', (
    tester,
  ) async {
    final applied = <int>[];
    await showPanel(
      tester,
      _Player(),
      changeDelay: (value) async => applied.add(value),
    );
    expect(
      find.text('Aucune piste de sous-titres disponible.'),
      findsOneWidget,
    );
    await tester.tap(find.byTooltip('Retarder les sous-titres de 0,1 s'));
    await tester.pumpAndSettle();
    expect(applied.last, 100);
    await tester.tap(find.byTooltip('Avancer les sous-titres de 0,1 s'));
    await tester.pumpAndSettle();
    expect(applied.last, 0);
    await tester.enterText(find.byType(TextField), '-1,25');
    await tester.tap(find.text('Appliquer'));
    await tester.pumpAndSettle();
    expect(applied.last, -1250);
    expect(find.text('Décalage appliqué : -1,250 s'), findsOneWidget);
    await tester.tap(find.text('Réinitialiser le décalage'));
    await tester.pumpAndSettle();
    expect(applied.last, 0);
    await tester.enterText(find.byType(TextField), 'abc');
    await tester.tap(find.text('Appliquer'));
    await tester.pumpAndSettle();
    expect(applied, [100, 0, -1250, 0]);
    expect(find.textContaining('entre −600 et 600'), findsOneWidget);
  });

  testWidgets('embedded and provider subtitles can be selected and disabled', (
    tester,
  ) async {
    const embedded = SubtitleTrack('1', 'Français embarqué', 'fr');
    final player = _Player([embedded]);
    await showPanel(
      tester,
      player,
      external: const [
        SourceSubtitle('https://example.com/fr.vtt', 'Français externe', 'fr'),
      ],
    );
    await tapVisible(tester, find.text('Français embarqué'));
    await tester.pumpAndSettle();
    expect(player.selected.subtitle, embedded);
    await tapVisible(tester, find.text('Français externe · Fournisseur'));
    await tester.pumpAndSettle();
    expect(player.selected.subtitle.uri, isTrue);
    expect(player.selected.subtitle.id, 'https://example.com/fr.vtt');
    await tapVisible(tester, find.text('Désactivés'));
    await tester.pumpAndSettle();
    expect(player.selected.subtitle.id, 'no');
  });

  testWidgets('a pending timing update preserves a newer edit', (tester) async {
    final firstUpdate = Completer<void>();
    final applied = <int>[];
    await showPanel(
      tester,
      _Player(),
      changeDelay: (value) async {
        applied.add(value);
        if (applied.length == 1) await firstUpdate.future;
      },
    );
    await tester.enterText(find.byType(TextField), '1');
    await tester.tap(find.text('Appliquer'));
    await tester.pump();
    expect(
      tester.widget<TextField>(find.byType(TextField)).enabled,
      isNot(false),
    );
    await tester.enterText(find.byType(TextField), '-1');
    firstUpdate.complete();
    await tester.pumpAndSettle();
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      '-1',
    );
    await tester.tap(find.text('Appliquer'));
    await tester.pumpAndSettle();
    expect(applied, [1000, -1000]);
  });

  testWidgets('timing failure is visible and the dialog fits a narrow screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    double? fontSize;
    await showPanel(
      tester,
      _Player(),
      changeDelay: (_) async => throw StateError('unavailable'),
      changeSize: (value) async => fontSize = value,
    );
    await tester.tap(find.byTooltip('Retarder les sous-titres de 0,1 s'));
    await tester.pumpAndSettle();
    expect(find.text('Décalage appliqué : 0,000 s'), findsOneWidget);
    expect(find.textContaining('Impossible d’appliquer'), findsOneWidget);
    await tester.ensureVisible(find.byType(SubtitleSizeControl));
    for (var i = 0; i < 5; i++) {
      await tester.tap(find.byTooltip('Augmenter la taille des sous-titres'));
      await tester.pumpAndSettle();
    }
    expect(fontSize, 48);
    expect(tester.takeException(), isNull);
  });
}
