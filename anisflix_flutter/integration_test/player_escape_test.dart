import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/player.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/platform_bridge.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('native player handles Escape before fullscreen and navigation', (
    tester,
  ) async {
    MediaKit.ensureInitialized();
    await PlatformBridge.initialize();
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final folder = await Directory.systemTemp.createTemp('anisflix-escape-');
    final clip = await File(
      '${const String.fromEnvironment('FIXTURE_DIR')}/test-subtitles.mkv',
    ).copy('${folder.path}/test.mkv');
    final frameTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!tester.binding.framesEnabled) {
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        tester.binding.scheduleForcedFrame();
      }
    });
    addTearDown(frameTimer.cancel);
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData.dark(),
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push<void>(
                context,
                MaterialPageRoute(
                  builder: (_) => PlayerScreen(
                    library: library,
                    item: const MediaItem(
                      id: 9002,
                      type: 'movie',
                      title: 'Test Échap',
                    ),
                    source: StreamSource(clip.path, 'Fixture locale'),
                  ),
                ),
              ),
              child: const Text('Ouvrir le lecteur'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Ouvrir le lecteur'));
    await tester.pumpAndSettle();

    Future<void> waitFor(bool Function() ready) async {
      final deadline = DateTime.now().add(const Duration(seconds: 30));
      while (!ready()) {
        if (DateTime.now().isAfter(deadline)) {
          fail('Player Escape test timed out.');
        }
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 100)),
        );
        await tester.pump();
      }
      await tester.pump();
    }

    VideoState video() => tester.state<VideoState>(find.byType(Video).last);
    double opacity() => tester
        .widget<AnimatedOpacity>(
          find.byKey(const ValueKey('player-controls-visibility')).last,
        )
        .opacity;
    Future<void> escape() async {
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));
    }

    final player = tester.widget<Video>(find.byType(Video)).controller.player;
    await waitFor(() => player.state.position.inMilliseconds > 100);
    await tester.runAsync(player.pause);
    final mouse = await tester.createGesture(kind: ui.PointerDeviceKind.mouse);
    await mouse.addPointer();
    addTearDown(mouse.removePointer);
    var hover = false;
    Future<void> reveal() async {
      final center = tester.getRect(find.byType(Video).last).center;
      hover = !hover;
      await mouse.moveTo(center + Offset(hover ? 1 : -1, 0));
      await tester.pump(const Duration(milliseconds: 200));
      expect(opacity(), 1);
    }

    try {
      await reveal();
      await escape();
      expect(opacity(), 0);
      expect(find.byType(PlayerScreen), findsOneWidget);
      await reveal();
      await tester.tap(find.byTooltip('Plein écran'));
      await waitFor(() => video().isFullscreen());
      await tester.pumpAndSettle();
      await reveal();
      await escape();
      expect(opacity(), 0);
      expect(video().isFullscreen(), isTrue);
      await escape();
      await waitFor(() => !video().isFullscreen());
      await tester.pumpAndSettle();

      await reveal();
      await tester.tap(find.byTooltip('Sous-titres et décalage'));
      await tester.pumpAndSettle();
      expect(
        tester.getTopLeft(find.text('Décalage')).dy,
        lessThan(tester.getTopLeft(find.text('Désactivés')).dy),
      );
      expect(
        find.byKey(const ValueKey('subtitle-delay-input')).hitTestable(),
        findsOneWidget,
      );
      await escape();
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.byType(PlayerScreen), findsOneWidget);
      await reveal();
      // Auto-hide must have the same exit behavior as an explicit hide.
      await tester.pump(const Duration(seconds: 3));
      await tester.pump(const Duration(milliseconds: 200));
      expect(opacity(), 0);
      await escape();
      await tester.pumpAndSettle();
      expect(find.byType(PlayerScreen), findsNothing);
      expect(find.text('Ouvrir le lecteur'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      await tester.pumpWidget(const SizedBox());
      await folder.delete(recursive: true);
    }
  }, timeout: const Timeout(Duration(minutes: 3)));
}
