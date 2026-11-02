import 'dart:async';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/widgets/subtitle_settings.dart';
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
  Future<void> showPanel(
    WidgetTester tester,
    _Player player, {
    List<SourceSubtitle> external = const [],
    Future<void> Function(int)? changeDelay,
    Future<void> Function(double)? changeSize,
  }) async {
    addTearDown(player.streams.selection.close);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showDialog<void>(
                context: context,
                builder: (_) => SubtitleSettingsDialog(
                  player: player,
                  externalTracks: external,
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
    await tester.pumpAndSettle();
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
    await tester.tap(find.text('Français embarqué'));
    await tester.pumpAndSettle();
    expect(player.selected.subtitle, embedded);
    await tester.tap(find.text('Français externe · Fournisseur'));
    await tester.pumpAndSettle();
    expect(player.selected.subtitle.uri, isTrue);
    expect(player.selected.subtitle.id, 'https://example.com/fr.vtt');
    await tester.tap(find.text('Désactivés'));
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
    await tester.ensureVisible(find.byType(DropdownButtonFormField<double>));
    await tester.tap(find.byType(DropdownButtonFormField<double>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('48').last);
    await tester.pumpAndSettle();
    expect(fontSize, 48);
    expect(tester.takeException(), isNull);
  });
}
