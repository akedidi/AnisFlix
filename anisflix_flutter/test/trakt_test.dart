import 'dart:async';
import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/trakt.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class MemoryTokens implements TokenStorage {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async {
    this.value = value;
  }

  @override
  Future<void> clear() async {
    value = null;
  }
}

void main() {
  var now = DateTime(2026, 11, 2);
  late MemoryTokens storage;
  setUp(() {
    now = DateTime(2026, 11, 2);
    storage = MemoryTokens();
  });
  final device = {
    'device_code': 'private-device-code',
    'user_code': 'TEST',
    'verification_url': 'https://trakt.tv/activate',
    'interval': 5,
    'expires_in': 60,
  };
  test(
    'device flow respects interval, slows down and stores tokens securely',
    () async {
      var polls = 0;
      final service = TraktService(
        backend: () => 'https://example.test',
        storage: storage,
        clock: () => now,
        client: MockClient((request) async {
          if (request.url.queryParameters['type'] == 'trakt-device-code') {
            return http.Response(jsonEncode(device), 200);
          }
          polls++;
          expect(
            jsonDecode(request.body)['device_code'],
            'private-device-code',
          );
          return polls == 1
              ? http.Response('{}', 429)
              : http.Response(
                  '{"access_token":"private-access","refresh_token":"private-refresh","expires_in":60}',
                  200,
                );
        }),
      );
      await service.begin();
      await service.poll();
      expect(polls, 0);
      now = now.add(const Duration(seconds: 5));
      await service.poll();
      expect(polls, 1);
      now = now.add(const Duration(seconds: 5));
      await service.poll();
      expect(polls, 1);
      now = now.add(const Duration(seconds: 5));
      await service.poll();
      expect(service.connected, true);
      expect(storage.value, isNotNull);
      expect(service.challenge, isNull);
      await service.disconnect();
      expect(storage.value, isNull);
      expect(service.connected, false);
      service.dispose();
    },
  );
  test('cancelled authorization cannot store a late token response', () async {
    final pending = Completer<http.Response>();
    final service = TraktService(
      backend: () => 'https://example.test',
      storage: storage,
      clock: () => now,
      client: MockClient(
        (request) async =>
            request.url.queryParameters['type'] == 'trakt-device-code'
            ? http.Response(jsonEncode(device), 200)
            : pending.future,
      ),
    );
    await service.begin();
    now = now.add(const Duration(seconds: 5));
    final poll = service.poll();
    service.cancel();
    pending.complete(
      http.Response(
        '{"access_token":"private-access","refresh_token":"private-refresh"}',
        200,
      ),
    );
    await poll;
    expect(service.connected, false);
    expect(storage.value, isNull);
    service.dispose();
  });
  test('expired authorization stops polling', () async {
    var calls = 0;
    final service = TraktService(
      backend: () => 'https://example.test',
      storage: storage,
      clock: () => now,
      client: MockClient((request) async {
        calls++;
        return http.Response(jsonEncode(device), 200);
      }),
    );
    await service.begin();
    now = now.add(const Duration(seconds: 61));
    await service.poll();
    expect(calls, 1);
    expect(service.challenge, isNull);
    expect(service.error, contains('expiré'));
    service.dispose();
  });
  test('episode scrobble uses series identity and clamps progress', () async {
    storage.value = jsonEncode({
      'access_token': 'private-access',
      'refresh_token': 'private-refresh',
      'expires_at': '2027-01-01T00:00:00Z',
    });
    final service = TraktService(
      backend: () => 'https://example.test',
      storage: storage,
      client: MockClient((request) async {
        final body = jsonDecode(request.body);
        expect(body['progress'], 100);
        expect(body['show']['ids']['tmdb'], 1429);
        expect(body['episode'], {'season': 4, 'number': 30});
        return http.Response('{}', 201);
      }),
    );
    await service.restore();
    expect(
      await service.scrobble(
        const MediaItem(id: 1429, type: 'tv', title: 'Série'),
        1.5,
        'stop',
        season: 4,
        episode: 30,
      ),
      true,
    );
    service.dispose();
  });
}
