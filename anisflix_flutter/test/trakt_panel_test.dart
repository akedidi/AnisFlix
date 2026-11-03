import 'dart:convert';

import 'package:anisflix_flutter/screens/trakt_panel.dart';
import 'package:anisflix_flutter/services/trakt.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _Tokens implements TokenStorage {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async => this.value = value;
  @override
  Future<void> clear() async => value = null;
}

void main() {
  for (final authorize in [false, true]) {
    testWidgets(
      'Trakt dialog ${authorize ? 'closes after authorization' : 'cancels without keeping a pending request'}',
      (tester) async {
        var now = DateTime(2026, 11, 3);
        final tokens = _Tokens();
        final service = TraktService(
          backend: () => 'https://example.test',
          storage: tokens,
          clock: () => now,
          client: MockClient(
            (request) async => http.Response(
              jsonEncode(
                request.url.queryParameters['type'] == 'trakt-device-code'
                    ? {
                        'device_code': 'test-device',
                        'user_code': 'TEST',
                        'verification_url': 'https://trakt.tv/activate',
                        'expires_in': 60,
                        'interval': 5,
                      }
                    : {
                        'access_token': 'test-access',
                        'refresh_token': 'test-refresh',
                        'expires_in': 60,
                      },
              ),
              200,
            ),
          ),
        );
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: TraktPanel(service: service)),
          ),
        );
        await tester.tap(find.text('Connecter Trakt'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        await tester.pump();
        expect(find.text('TEST'), findsOneWidget);
        expect(find.text('En attente d’autorisation…'), findsOneWidget);
        if (authorize) {
          now = now.add(const Duration(seconds: 5));
          await tester.pump(const Duration(seconds: 5));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 300));
          expect(find.byType(AlertDialog), findsNothing);
          expect(find.text('Connecté à Trakt'), findsOneWidget);
          expect(tokens.value, isNotNull);
        } else {
          await tester.tap(find.text('Annuler'));
          await tester.pumpAndSettle();
          expect(service.challenge, isNull);
          expect(service.connected, false);
          expect(tokens.value, isNull);
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        service.dispose();
      },
    );
  }
}
