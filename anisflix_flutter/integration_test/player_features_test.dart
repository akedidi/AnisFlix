import 'dart:io';
import 'dart:ui' as ui;

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/player.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/platform_bridge.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('native subtitle timing and floating PiP retain the video player', (
    tester,
  ) async {
    // Only keyboard input is mocked; video, timing and windows remain native.
    tester.testTextInput.register();
    addTearDown(tester.testTextInput.unregister);
    MediaKit.ensureInitialized();
    await PlatformBridge.initialize();
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final fixtures = Directory(const String.fromEnvironment('FIXTURE_DIR'));
    final folder = await Directory.systemTemp.createTemp('anisflix-features-');
    final clip = await File('${fixtures.path}/test-subtitles.mkv')
        .copy('${folder.path}/test.mkv');
    final subtitle = await File('${folder.path}/external.srt').writeAsString(
      '1\n00:00:02,000 --> 00:00:04,000\nSOUS-TITRE FOURNISSEUR\n',
    );
    const capture = ValueKey('features-capture');

    Future<void> waitFor(bool Function() ready) async {
      final deadline = DateTime.now().add(const Duration(seconds: 30));
      while (!ready()) {
        if (DateTime.now().isAfter(deadline)) {
          debugPrint(
            'FEATURE_VISIBLE_TEXT=${tester.widgetList<Text>(find.byType(Text)).map((text) => text.data).join(' | ')}',
          );
          fail('Player feature timed out.');
        }
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 100)),
        );
        await tester.pump();
      }
      await tester.pump();
    }

    Future<void> screenshot(String name) async {
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(capture),
      );
      final image = await boundary.toImage();
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      final file = File('${Directory.systemTemp.path}/$name.png');
      await file.writeAsBytes(bytes!.buffer.asUint8List());
      image.dispose();
      debugPrint('PLAYER_FEATURE_SCREENSHOT=${file.path}');
    }

    try {
      await tester.pumpWidget(
        RepaintBoundary(
          key: capture,
          child: MaterialApp(
            theme: ThemeData.dark(),
            debugShowCheckedModeBanner: false,
            home: PlayerScreen(
              library: library,
              item: const MediaItem(
                id: 9001,
                type: 'movie',
                title: 'Test des sous-titres et du PiP',
              ),
              source: StreamSource(
                clip.path,
                'Fixture locale',
                subtitles: [
                  SourceSubtitle(
                    subtitle.uri.toString(),
                    'Français fournisseur',
                    'fr',
                  ),
                ],
              ),
            ),
          ),
        ),
      );
      final controller = tester.widget<Video>(find.byType(Video)).controller;
      final player = controller.player;
      final native = player.platform as NativePlayer;
      await waitFor(() => player.state.position.inMilliseconds > 500);
      await tester.runAsync(player.pause);
      await tester.pump();

      await tester.tap(find.byTooltip('Sous-titres et décalage'));
      await tester.pumpAndSettle();
      expect(find.text('Français embarqué'), findsOneWidget);
      await tester.tap(find.text('Français embarqué'));
      await waitFor(() => player.state.track.subtitle.id == '1');
      await tester.tap(find.text('Français fournisseur · Fournisseur'));
      await waitFor(() => player.state.tracks.subtitle.length > 3);

      Future<void> setDelay(String value, String expected) async {
        await tester.enterText(
          find.byKey(const ValueKey('subtitle-delay-input')),
          value,
        );
        await tester.pump();
        await tester.ensureVisible(find.text('Appliquer'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Appliquer'));
        try {
          await waitFor(
            () => find
                .text('Décalage appliqué : $expected s')
                .evaluate()
                .isNotEmpty,
          );
        } catch (_) {
          debugPrint(
            'NATIVE_SUBTITLE_DELAY=${await native.getProperty('sub-delay')}',
          );
          await screenshot('anisflix-subtitle-settings-failure');
          rethrow;
        }
      }

      await tester.tap(find.byTooltip('Retarder les sous-titres de 0,1 s'));
      await waitFor(
        () => find.text('Décalage appliqué : 0,100 s').evaluate().isNotEmpty,
      );
      expect(
        double.parse(await native.getProperty('sub-delay')),
        closeTo(.1, .001),
      );
      await setDelay('1,0', '1,000');
      expect(
        double.parse(await native.getProperty('sub-delay')),
        closeTo(1, .001),
      );
      await tester.runAsync(() async {
        await player.seek(const Duration(milliseconds: 2500));
        await Future<void>.delayed(const Duration(milliseconds: 300));
      });
      expect(player.state.subtitle.join(), isNot(contains('FOURNISSEUR')));
      await tester.runAsync(
        () => player.seek(const Duration(milliseconds: 3500)),
      );
      await waitFor(() => player.state.subtitle.join().contains('FOURNISSEUR'));

      await setDelay('-1,0', '-1,000');
      expect(
        double.parse(await native.getProperty('sub-delay')),
        closeTo(-1, .001),
      );
      await tester.runAsync(
        () => player.seek(const Duration(milliseconds: 1500)),
      );
      await waitFor(() => player.state.subtitle.join().contains('FOURNISSEUR'));

      await tester.ensureVisible(find.byType(DropdownButtonFormField<double>));
      await tester.tap(find.byType(DropdownButtonFormField<double>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('48').last);
      await waitFor(() => library.prefs.getDouble('subtitleFontSize') == 48);
      expect(
        tester
            .widget<Video>(find.byType(Video))
            .subtitleViewConfiguration
            .style
            .fontSize,
        48,
      );
      await screenshot('anisflix-subtitle-settings-macos');
      await tester.tap(find.text('Fermer'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);

      final original = (await PlatformBridge.pictureInPictureState())!;
      await tester.tap(find.byTooltip('Image dans l’image'));
      await waitFor(() => PlatformBridge.pictureInPicture.value);
      final floating = (await PlatformBridge.pictureInPictureState())!;
      expect(floating['active'], isTrue);
      expect(floating['floating'], isTrue);
      expect(floating['width'] as num, lessThan(original['width'] as num));
      expect(floating['height'] as num, lessThan(300));
      expect(
        tester.widget<Video>(find.byType(Video)).controller,
        same(controller),
      );
      expect(player.state.playing, isFalse);
      await screenshot('anisflix-pip-macos');
      await tester.tap(find.byTooltip('Lecture'));
      await waitFor(() => player.state.playing);
      await tester.tap(find.byTooltip('Pause'));
      await waitFor(() => !player.state.playing);
      await tester.tap(find.byTooltip('Revenir au lecteur'));
      await waitFor(() => !PlatformBridge.pictureInPicture.value);
      final restored = (await PlatformBridge.pictureInPictureState())!;
      expect(restored['floating'], isFalse);
      expect(restored['width'], original['width']);
      expect(restored['height'], original['height']);
      expect(
        tester.widget<Video>(find.byType(Video)).controller,
        same(controller),
      );

      await tester.tap(find.byTooltip('Image dans l’image'));
      await waitFor(() => PlatformBridge.pictureInPicture.value);
      await tester.pumpWidget(const SizedBox());
      await waitFor(() => !PlatformBridge.pictureInPicture.value);
      expect(
        (await PlatformBridge.pictureInPictureState())!['floating'],
        isFalse,
      );
      expect(tester.takeException(), isNull);
    } finally {
      await PlatformBridge.exitPip();
      await tester.pumpWidget(const SizedBox());
      await folder.delete(recursive: true);
    }
  }, timeout: const Timeout(Duration(minutes: 4)));
}
