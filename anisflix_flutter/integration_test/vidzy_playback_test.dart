import 'dart:async';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/screens/player.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/platform_bridge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Opt-in provider check, using a fresh browser session instead of saved tokens:
// flutter test integration_test/vidzy_playback_test.dart -d macos \
//   --dart-define=VIDZY_EMBED_URL=https://vidzy.live/embed-2235b5pk0zgq.html
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const embed = String.fromEnvironment('VIDZY_EMBED_URL');
  testWidgets('Vidzy renders after forward and backward seeks beyond preview', (
    tester,
  ) async {
    MediaKit.ensureInitialized();
    await PlatformBridge.initialize();
    SharedPreferences.setMockInitialValues({});
    final library = await Library.load();
    final api = CatalogApi(library);
    addTearDown(api.close);
    final heartbeat = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!tester.binding.framesEnabled) {
        tester.binding.handleAppLifecycleStateChanged(
          AppLifecycleState.resumed,
        );
        tester.binding.scheduleForcedFrame();
      }
    });
    addTearDown(heartbeat.cancel);
    final source = await tester.runAsync(
      () => api.resolveSource(
        const StreamSource(embed, 'Vidzy', provider: 'vidzy', format: 'embed'),
      ),
    );
    expect(source, isNotNull);
    expect(Uri.parse(source!.url).queryParameters['gk'], isNotEmpty);
    expect(source.headers['Referer'], isNotEmpty);
    await tester.pumpWidget(
      MaterialApp(
        home: PlayerScreen(
          library: library,
          item: const MediaItem(
            id: 1400837,
            type: 'movie',
            title: 'Malfaisante',
          ),
          source: source,
        ),
      ),
    );
    await tester.pump();
    final player = tester.widget<Video>(find.byType(Video)).controller.player;
    Future<void> waitFor(bool Function() ready) async {
      final deadline = DateTime.now().add(const Duration(seconds: 40));
      while (!ready()) {
        if (DateTime.now().isAfter(deadline)) {
          fail(
            'Playback timed out at ${player.state.position}; buffering=${player.state.buffering}.',
          );
        }
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 200)),
        );
        await tester.pump();
      }
    }

    try {
      await waitFor(
        () => player.state.position.inSeconds > 0 && player.state.width != null,
      );
      expect(player.state.duration.inMinutes, greaterThan(90));
      for (final seconds in [600, 2800, 120, 5400]) {
        await tester.runAsync(() => player.seek(Duration(seconds: seconds)));
        await waitFor(
          () =>
              player.state.position.inMilliseconds > seconds * 1000 + 400 &&
              player.state.position.inSeconds < seconds + 10 &&
              !player.state.buffering,
        );
        expect(player.state.width, greaterThan(0));
        expect(player.state.height, greaterThan(0));
        final native = player.platform as NativePlayer;
        final dropped = int.tryParse(
          await tester.runAsync(() => native.getProperty('frame-drop-count')) ??
              '0',
        );
        debugPrint(
          'VIDZY_SEEK_OK: target=$seconds position=${player.state.position.inMilliseconds} frameDrops=${dropped ?? 'unavailable'}',
        );
        expect(
          find.textContaining('Impossible de lire cette source'),
          findsNothing,
        );
      }
    } finally {
      await tester.pumpWidget(const SizedBox());
      await tester.pump();
    }
  }, skip: embed.isEmpty);
}
