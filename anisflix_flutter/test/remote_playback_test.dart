import 'dart:convert';
import 'dart:io';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/remote_playback.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final previousOverrides = HttpOverrides.current;
  setUp(() => HttpOverrides.global = null);
  tearDown(() => HttpOverrides.global = previousOverrides);
  test(
    'AirPlay sends URL, resume fraction and real playback commands',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      final calls = <(String, String)>[];
      server.listen((request) async {
        calls.add((
          request.uri.toString(),
          await utf8.decoder.bind(request).join(),
        ));
        request.response.statusCode = 200;
        await request.response.close();
      });
      final remote = RemotePlayback(onDisconnected: () {});
      try {
        await remote.airPlayTo(
          {'host': '127.0.0.1', 'port': server.port},
          const StreamSource('https://example.org/video.mp4', 'Test'),
          const Duration(seconds: 30),
          const Duration(seconds: 120),
        );
        expect(remote.active, isTrue);
        expect(calls.first.$1, '/play');
        expect(
          calls.first.$2,
          contains('Content-Location: https://example.org/video.mp4'),
        );
        expect(calls.first.$2, contains('Start-Position: 0.25'));
        await remote.playOrPause();
        expect(calls.last.$1, '/rate?value=0');
        expect(remote.playing, isFalse);
        await remote.seek(const Duration(seconds: 40));
        expect(calls.last.$1, '/scrub?position=40.0');
        await remote.disconnect();
        expect(calls.last.$1, '/stop');
        expect(remote.active, isFalse);
      } finally {
        remote.dispose();
        await server.close(force: true);
      }
    },
  );

  test(
    'A receiver refusing playback never replaces the local session',
    () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      server.listen((request) async {
        request.response.statusCode = 401;
        await request.response.close();
      });
      final remote = RemotePlayback(onDisconnected: () {});
      try {
        await expectLater(
          remote.airPlayTo(
            {'host': '127.0.0.1', 'port': server.port},
            const StreamSource('https://example.org/video.mp4', 'Test'),
            Duration.zero,
            Duration.zero,
          ),
          throwsA(isA<HttpException>()),
        );
        expect(remote.active, isFalse);
      } finally {
        remote.dispose();
        await server.close(force: true);
      }
    },
  );
}
