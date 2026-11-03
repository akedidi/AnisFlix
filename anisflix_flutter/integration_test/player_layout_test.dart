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

// tool/prepare_media_fixture.py creates the local demonstration clip.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('player fills its viewport before playback and after resizing', (
    tester,
  ) async {
    MediaKit.ensureInitialized();
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final fixture = File(
      '${const String.fromEnvironment('FIXTURE_DIR', defaultValue: '/data/local/tmp/anisflix-media')}/test.mp4',
    );
    expect(
      await fixture.exists(),
      isTrue,
      reason: 'Prepare the media fixture.',
    );
    const captureKey = ValueKey('player-capture');
    final folder = await Directory.systemTemp.createTemp('anisflix-player-');
    final localVideo = await fixture.copy('${folder.path}/test.mp4');

    Future<void> showPlayer(Size size) async {
      await tester.pumpWidget(
        Align(
          alignment: Alignment.topLeft,
          child: SizedBox.fromSize(
            size: size,
            child: RepaintBoundary(
              key: captureKey,
              child: MaterialApp(
                debugShowCheckedModeBanner: false,
                theme: ThemeData.dark(),
                home: PlayerScreen(
                  library: library,
                  item: const MediaItem(
                    id: 9000,
                    type: 'movie',
                    title: 'Test du lecteur macOS',
                  ),
                  source: StreamSource(localVideo.path, 'Fixture locale'),
                ),
              ),
            ),
          ),
        ),
      );
    }

    void expectFullViewport() {
      final viewport = tester.getRect(find.byType(Scaffold));
      final video = tester.getRect(find.byType(Video));
      expect(viewport.height, greaterThan(300));
      expect(video, viewport, reason: 'Video must fill the player screen.');
      expect(tester.getTopLeft(find.byTooltip('Retour')).dy, lessThan(40));
      for (final key in [
        if (PlatformBridge.supportsPip) 'player-pip',
        'player-subtitles',
        'player-aspect-ratio',
      ]) {
        final button = tester.getRect(find.byKey(ValueKey(key)));
        expect(button.left, greaterThanOrEqualTo(viewport.left));
        expect(button.right, lessThanOrEqualTo(viewport.right));
        expect(button.bottom, lessThanOrEqualTo(viewport.bottom));
        expect(button.top, greaterThan(viewport.bottom - 100));
      }
      expect(
        tester.getRect(find.byKey(const ValueKey('player-aspect-ratio'))).right,
        greaterThan(viewport.right - 110),
      );
      expect(tester.takeException(), isNull);
    }

    try {
      await showPlayer(const Size(960, 540));
      expectFullViewport();
      final player = tester.widget<Video>(find.byType(Video)).controller.player;
      final errors = <String>[];
      final subscription = player.stream.error.listen(errors.add);
      addTearDown(subscription.cancel);
      final deadline = DateTime.now().add(const Duration(seconds: 30));
      while (player.state.position.inMilliseconds < 500 ||
          player.state.width == null ||
          player.state.width! <= 0) {
        if (DateTime.now().isAfter(deadline)) {
          fail(
            'Local video did not start: $errors; '
            'playing=${player.state.playing}, '
            'duration=${player.state.duration}, '
            'playlist=${player.state.playlist.medias.length}.',
          );
        }
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 100)),
        );
        await tester.pump();
      }
      await tester.runAsync(() => player.pause());
      await tester.pump();
      expectFullViewport();

      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(captureKey),
      );
      final image = await boundary.toImage();
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      final screenshot = File(
        '${Directory.systemTemp.path}/anisflix-player-macos.png',
      );
      await screenshot.writeAsBytes(bytes!.buffer.asUint8List());
      image.dispose();
      debugPrint('PLAYER_SCREENSHOT=${screenshot.path}');

      for (final size in [
        const Size(640, 360),
        const Size(480, 600),
        const Size(320, 600),
      ]) {
        debugPrint('PLAYER_LAYOUT_SIZE=$size');
        await showPlayer(size);
        await tester.pump();
        expectFullViewport();
        expect(
          tester.widget<Video>(find.byType(Video)).controller.player,
          same(player),
        );
      }
    } finally {
      await tester.pumpWidget(const SizedBox());
      await folder.delete(recursive: true);
    }
  });
}
