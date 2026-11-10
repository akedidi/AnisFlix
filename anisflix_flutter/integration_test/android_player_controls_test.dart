import 'dart:io';
import 'dart:ui' as ui;

import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/l10n/app_localizations.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/player.dart';
import 'package:anisflix_flutter/widgets/player_settings_sheet.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/platform_bridge.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:shared_preferences/shared_preferences.dart';

// This validates native playback state and controls. It does not certify the
// decoded image on emulators affected by the Media Kit OpenGL issue.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Android player controls retain seeking, settings and progress', (
    tester,
  ) async {
    MediaKit.ensureInitialized();
    await PlatformBridge.initialize();
    final tv =
        const bool.fromEnvironment('TV_MODE') || PlatformBridge.deviceIsTv;
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final folder = await Directory.systemTemp.createTemp('android-controls-');
    final fixture = await File('/data/local/tmp/anisflix-media/test.mp4')
        .copy('${folder.path}/test.mp4');
    const item = MediaItem(id: 99001, type: 'tv', title: 'Pluribus');
    const capture = ValueKey('android-controls-capture');
    var catalogueClicks = 0;

    Future<void> waitFor(bool Function() ready) async {
      final deadline = DateTime.now().add(const Duration(seconds: 30));
      while (!ready()) {
        if (DateTime.now().isAfter(deadline)) {
          fail('Native player state timed out.');
        }
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 100)),
        );
        await tester.pump();
      }
    }

    Future<void> captureFrame(String name) async {
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(capture),
      );
      final screenshot = await boundary.toImage();
      final bytes = await screenshot.toByteData(format: ui.ImageByteFormat.png);
      final path =
          '${Directory.systemTemp.path}/android-${tv ? 'tv' : 'mobile'}-$name.png';
      await File(path).writeAsBytes(bytes!.buffer.asUint8List());
      const captureUrl = String.fromEnvironment('CAPTURE_URL');
      if (captureUrl.isNotEmpty) {
        final client = HttpClient();
        try {
          final request = await client.postUrl(
            Uri.parse(captureUrl)
                .replace(path: '/${tv ? 'tv' : 'mobile'}-$name.png'),
          );
          request.contentLength = bytes.lengthInBytes;
          request.add(bytes.buffer.asUint8List());
          final response = await request.close();
          await response.drain<void>();
          expect(response.statusCode, 200);
        } finally {
          client.close(force: true);
        }
      }
      screenshot.dispose();
      debugPrint('ANDROID_CONTROLS_SCREENSHOT=$path');
    }

    try {
      await tester.pumpWidget(
        RepaintBoundary(
          key: capture,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: appTheme(Brightness.dark),
            locale: const Locale('fr'),
            localizationsDelegates: AppLocalizations.delegates,
            supportedLocales: AppLocalizations.supportedLocales,
            shortcuts: {
              ...WidgetsApp.defaultShortcuts,
              const SingleActivator(LogicalKeyboardKey.select):
                  const ActivateIntent(),
            },
            home: Builder(
              builder: (context) => Scaffold(
                body: Column(
                  children: [
                    ElevatedButton(
                      key: const ValueKey('open-player'),
                      onPressed: () => PlayerScreen.present(
                        context,
                        library: library,
                        item: item,
                        season: 2,
                        episode: 3,
                        source: StreamSource(fixture.path, 'Fixture locale'),
                      ),
                      child: const Text('Ouvrir le lecteur'),
                    ),
                    TextButton(
                      onPressed: () => catalogueClicks++,
                      child: const Text('Catalogue sous le lecteur'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.byKey(const ValueKey('open-player')));
      await tester.pump();
      await waitFor(() => find.byType(Video).evaluate().isNotEmpty);
      final player = tester.widget<Video>(find.byType(Video)).controller.player;
      await waitFor(() => player.state.duration > Duration.zero);
      await tester.runAsync(() => player.pause());
      await tester.runAsync(() => player.seek(const Duration(seconds: 2)));
      await waitFor(() => player.state.position.inMilliseconds >= 1500);
      await tester.sendKeyEvent(LogicalKeyboardKey.arrowDown);
      await tester.pump(const Duration(milliseconds: 250));
      expect(find.text('Pluribus'), findsOneWidget);

      if (tv) {
        expect(
          tester
              .widget<IconButton>(find.byKey(const ValueKey('tv-play-pause')))
              .focusNode!
              .hasFocus,
          isTrue,
        );
        await tester.sendKeyEvent(LogicalKeyboardKey.arrowLeft);
        await tester.sendKeyEvent(LogicalKeyboardKey.select);
        await waitFor(() => player.state.position.inMilliseconds < 500);
        expect(find.byKey(const ValueKey('tv-seek-bar')), findsOneWidget);
      } else {
        expect(find.byTooltip('Reculer de 10 secondes'), findsOneWidget);
        expect(find.byTooltip('Avancer de 10 secondes'), findsOneWidget);
        await tester.tap(find.byTooltip('Reculer de 10 secondes'));
        await waitFor(() => player.state.position.inMilliseconds < 500);
      }

      if (tv) await tester.sendKeyEvent(LogicalKeyboardKey.arrowRight);
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 400)),
      );
      await tester.pump(const Duration(milliseconds: 250));
      await captureFrame('controls');
      await tester.tap(find.byKey(const ValueKey('player-subtitles')));
      await tester.pump(const Duration(milliseconds: 250));
      expect(find.byType(PlayerSettingsSheet), findsOneWidget);
      await captureFrame('subtitles');
      await tester.tap(find.byTooltip('Retarder les sous-titres de 0,1 s'));
      await tester.pump();
      await waitFor(() => find.text('0.1 s').evaluate().isNotEmpty);
      await tester.binding.handlePopRoute();
      await waitFor(() => find.byType(PlayerSettingsSheet).evaluate().isEmpty);
      expect(find.byType(PlayerSettingsSheet), findsNothing);
      expect(
        tester.widget<Video>(find.byType(Video)).controller.player,
        same(player),
      );
      await tester.tap(find.byKey(const ValueKey('player-aspect-ratio')));
      await tester.pump(const Duration(milliseconds: 300));
      await captureFrame('aspect');
      await tester.tap(find.text('4:3'));
      await waitFor(() => find.byType(PlayerSettingsSheet).evaluate().isEmpty);
      expect(library.prefs.getString('videoAspectMode'), 'standard');
      if (!tv) {
        await tester.tap(find.byKey(const ValueKey('player-minimize')));
        await tester.pump();
        expect(
          find.byKey(const ValueKey('mobile-mini-player')),
          findsOneWidget,
        );
        await captureFrame('mini');
        expect(find.text('Catalogue sous le lecteur'), findsOneWidget);
        await tester.tap(find.text('Catalogue sous le lecteur'));
        expect(catalogueClicks, 1);
        final retained = tester
            .widget<Video>(find.byType(Video, skipOffstage: false))
            .controller
            .player;
        expect(retained, same(player));
        await tester.tap(find.text('Pluribus'));
        await tester.pump();
        expect(find.byKey(const ValueKey('mobile-mini-player')), findsNothing);
        expect(
          tester.widget<Video>(find.byType(Video)).controller.player,
          same(player),
        );
        await tester.tap(find.byKey(const ValueKey('player-airplay')));
        await tester.pump(const Duration(milliseconds: 400));
        expect(find.text('Diffuser avec AirPlay'), findsOneWidget);
        await waitFor(
          () => find.byTooltip('Fermer').hitTestable().evaluate().isNotEmpty,
        );
        await tester.tap(find.byTooltip('Fermer').hitTestable());
        await waitFor(
          () => find.text('Diffuser avec AirPlay').evaluate().isEmpty,
        );
        await tester.tap(find.byKey(const ValueKey('player-cast')));
        await waitFor(
          () => find.text('Diffuser sur Chromecast').evaluate().isNotEmpty,
        );
        await waitFor(
          () => find.byTooltip('Fermer').hitTestable().evaluate().isNotEmpty,
        );
        await tester.tap(find.byTooltip('Fermer').hitTestable());
        await waitFor(
          () => find.text('Diffuser sur Chromecast').evaluate().isEmpty,
        );
        await tester.tap(find.byKey(const ValueKey('player-fullscreen')));
        await waitFor(
          () => find
              .byTooltip('Quitter le plein écran')
              .hitTestable()
              .evaluate()
              .isNotEmpty,
        );
        await tester.tap(find.byKey(const ValueKey('player-fullscreen')));
        await waitFor(
          () =>
              find.byTooltip('Plein écran').hitTestable().evaluate().isNotEmpty,
        );
      }
      await tester.runAsync(() => player.seek(const Duration(seconds: 3)));
      await waitFor(() => player.state.position.inMilliseconds >= 2500);
      if (!tv) {
        await tester.binding.handlePopRoute();
        await tester.pump();
        expect(
          find.byKey(const ValueKey('mobile-mini-player')),
          findsOneWidget,
        );
        await tester.tap(find.byKey(const ValueKey('mini-close')));
        await tester.pump();
        await waitFor(
          () =>
              find.byType(PlayerScreen, skipOffstage: false).evaluate().isEmpty,
        );
      }
      await tester.pumpWidget(const SizedBox());
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 300)),
      );
      expect(
        library.progress[library.progressKey(item, 2, 3)]?['position'],
        greaterThanOrEqualTo(2),
      );
    } finally {
      await tester.pumpWidget(const SizedBox());
      await folder.delete(recursive: true);
    }
  });
}
