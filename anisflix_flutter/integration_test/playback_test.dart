import 'dart:io';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/downloads.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/platform_bridge.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:integration_test/integration_test.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Prepare with tool/prepare_media_fixture.py and push the fixture directory to
// /data/local/tmp/anisflix-media on Android. No commercial stream is used.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  for (final filename in ['test.mp4', 'index.m3u8', 'index.mpd']) {
    testWidgets(
      '$filename downloads, renders offline, seeks and saves progress',
      (tester) async {
        MediaKit.ensureInitialized();
        await PlatformBridge.initialize();
        SharedPreferences.setMockInitialValues({});
        final library = await Library.load();
        final fixtures = Directory(
          const String.fromEnvironment(
            'FIXTURE_DIR',
            defaultValue: '/data/local/tmp/anisflix-media',
          ),
        );
        final folder = await Directory.systemTemp.createTemp(
          'anisflix-integration-',
        );
        final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        server.listen((request) async {
          final file = File(
            '${fixtures.path}/${request.uri.pathSegments.last}',
          );
          if (!await file.exists()) {
            request.response.statusCode = 404;
            await request.response.close();
            return;
          }
          request.response.headers.contentType = switch (file.path
              .split('.')
              .last) {
            'm3u8' => ContentType('application', 'vnd.apple.mpegurl'),
            'mpd' => ContentType('application', 'dash+xml'),
            _ => ContentType('video', 'mp4'),
          };
          request.response.contentLength = await file.length();
          await request.response.addStream(file.openRead());
          await request.response.close();
        });
        final player = Player();
        final controller = VideoController(player);
        final errors = <String>[];
        final subscription = player.stream.error.listen(errors.add);
        const item = MediaItem(id: 9000, type: 'movie', title: 'Fixture');
        try {
          await tester.runAsync(
            () => Downloads.start(
              library,
              item,
              StreamSource(
                'http://127.0.0.1:${server.port}/$filename',
                'Fixture',
              ),
              storageDirectory: folder,
            ),
          );
          await server.close(force: true);
          expect(library.downloads.length, 1);
          await tester.pumpWidget(
            MaterialApp(
              home: Scaffold(
                body: Video(controller: controller, controls: NoVideoControls),
              ),
            ),
          );
          await tester.runAsync(() async {
            await player
                .open(Media(library.downloads.single['path'] as String))
                .timeout(const Duration(seconds: 30));
            Future<void> waitFor(bool Function() ready) async {
              final deadline = DateTime.now().add(const Duration(seconds: 30));
              while (!ready()) {
                if (errors.isNotEmpty) fail(errors.join('\n'));
                if (DateTime.now().isAfter(deadline)) {
                  fail(
                    'Playback timed out: $filename, position=${player.state.position}, duration=${player.state.duration}',
                  );
                }
                await Future<void>.delayed(const Duration(milliseconds: 100));
              }
            }

            await waitFor(
              () =>
                  player.state.duration.inSeconds >= 5 &&
                  player.state.position.inMilliseconds > 600,
            );
            expect(player.state.width, greaterThan(0));
            expect(player.state.height, greaterThan(0));
            expect(player.state.tracks.audio.length, greaterThan(2));
            await player.seek(const Duration(seconds: 3));
            await waitFor(() => player.state.position.inSeconds >= 3);
            await player.pause();
            await library.saveProgress(
              item,
              null,
              null,
              player.state.position,
              player.state.duration,
            );
            final restored = await Library.load();
            expect(
              restored.progress[restored.progressKey(
                item,
                null,
                null,
              )]?['position'],
              greaterThanOrEqualTo(3),
            );
            expect(errors, isEmpty);
          });
        } finally {
          await server.close(force: true);
          await tester.pumpWidget(const SizedBox());
          await subscription.cancel();
          await player.dispose();
          await folder.delete(recursive: true);
        }
      },
      timeout: const Timeout(Duration(minutes: 2)),
    );
  }
  testWidgets('secure account storage round trip', (tester) async {
    const storage = FlutterSecureStorage(
      mOptions: MacOsOptions(usesDataProtectionKeychain: false),
    );
    final key = 'anisflix-integration-${DateTime.now().microsecondsSinceEpoch}';
    try {
      await storage.write(key: key, value: 'integration-fixture');
      expect(await storage.read(key: key), 'integration-fixture');
    } finally {
      await storage.delete(key: key);
    }
  });
}
