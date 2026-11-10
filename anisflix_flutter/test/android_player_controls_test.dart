import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/widgets/android_player_controls.dart';
import 'package:anisflix_flutter/widgets/aspect_ratio_button.dart';
import 'package:anisflix_flutter/widgets/player_settings_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> mount(
    WidgetTester tester, {
    required bool tv,
    required List<String> actions,
    Size? size,
  }) async {
    tester.view.physicalSize =
        size ?? (tv ? const Size(960, 540) : const Size(411, 914));
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final focus = FocusNode();
    final mode = ValueNotifier(VideoAspectMode.original);
    addTearDown(focus.dispose);
    addTearDown(mode.dispose);
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData.dark(),
        locale: const Locale('fr'),
        localizationsDelegates: AppLocalizations.delegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: AndroidPlayerControls(
            tv: tv,
            title: 'Pluribus',
            playing: true,
            fullscreen: false,
            position: const Duration(seconds: 35),
            duration: const Duration(minutes: 56, seconds: 28),
            buffered: const Duration(minutes: 1),
            volume: 100,
            playFocus: focus,
            onClose: () => actions.add('close'),
            onMinimize: () => actions.add('minimize'),
            onPlayPause: () => actions.add('play'),
            onRewind: () => actions.add('-10'),
            onForward: () => actions.add('+10'),
            onSubtitles: () => actions.add('cc'),
            onPip: () => actions.add('pip'),
            onFullscreen: () => actions.add('fullscreen'),
            onCast: () => actions.add('cast'),
            onAirPlay: () => actions.add('airplay'),
            onSeek: (_) => actions.add('seek'),
            onVolume: (_) => actions.add('volume'),
            hold: () {},
            release: () {},
            aspectButton: AspectRatioButton(
              tv: tv,
              mode: mode,
              releaseStyle: true,
              onSelected: (value) {
                mode.value = value;
                actions.add(value.name);
              },
            ),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('Mobile release placement and every visible action are wired', (
    tester,
  ) async {
    final actions = <String>[];
    await mount(tester, tv: false, actions: actions);
    double x(String key) => tester.getCenter(find.byKey(ValueKey(key))).dx;
    expect(x('mobile-rewind'), closeTo(100, 6));
    expect(x('mobile-play-pause'), closeTo(205.5, 1));
    expect(x('mobile-forward'), closeTo(311, 6));
    final footer = [
      'player-elapsed',
      'player-subtitles',
      'player-cast',
      'player-pip',
      'player-aspect-ratio',
      'player-fullscreen',
      'player-duration',
    ];
    for (var i = 1; i < footer.length; i++) {
      expect(x(footer[i]), greaterThan(x(footer[i - 1])));
    }
    expect(
      tester.getCenter(find.byKey(const ValueKey('mobile-seek-bar'))).dy,
      lessThan(
        tester.getCenter(find.byKey(const ValueKey('player-elapsed'))).dy,
      ),
    );
    for (final key in [
      'mobile-rewind',
      'mobile-play-pause',
      'mobile-forward',
      'player-subtitles',
      'player-cast',
      'player-pip',
      'player-fullscreen',
      'player-airplay',
      'player-minimize',
    ]) {
      await tester.tap(find.byKey(ValueKey(key)));
    }
    expect(actions, [
      '-10',
      'play',
      '+10',
      'cc',
      'cast',
      'pip',
      'fullscreen',
      'airplay',
      'minimize',
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'TV17 controls have circular focus, title only and the release footer',
    (tester) async {
      final actions = <String>[];
      await mount(tester, tv: true, actions: actions);
      expect(find.text('Pluribus'), findsOneWidget);
      expect(find.byKey(const ValueKey('player-pip')), findsNothing);
      expect(find.byKey(const ValueKey('player-fullscreen')), findsNothing);
      expect(find.byKey(const ValueKey('player-volume-slider')), findsNothing);
      final play = tester.widget<IconButton>(
        find.byKey(const ValueKey('tv-play-pause')),
      );
      play.focusNode!.requestFocus();
      await tester.pump();
      final style = play.style!;
      expect(
        style.backgroundColor!.resolve({WidgetState.focused}),
        AndroidPlayerControls.red,
      );
      expect(style.side!.resolve({WidgetState.focused})!.color, Colors.white);
      for (final key in [
        'tv-rewind',
        'tv-play-pause',
        'tv-forward',
        'player-close',
      ]) {
        await tester.tap(find.byKey(ValueKey(key)));
      }
      expect(actions, ['-10', 'play', '+10', 'close']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('Release aspect sheet applies and marks the selected format', (
    tester,
  ) async {
    final actions = <String>[];
    await mount(tester, tv: false, actions: actions);
    await tester.tap(find.byKey(const ValueKey('player-aspect-ratio')));
    await tester.pumpAndSettle();
    expect(find.byType(PlayerSettingsSheet), findsOneWidget);
    expect(find.text('Original'), findsOneWidget);
    expect(find.text('Étirer'), findsOneWidget);
    await tester.tap(find.text('4:3'));
    await tester.pumpAndSettle();
    expect(actions, ['standard']);
    expect(find.byType(PlayerSettingsSheet), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
