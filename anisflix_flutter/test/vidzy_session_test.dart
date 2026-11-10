import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/catalog_api.dart';
import 'package:anisflix_flutter/services/direct_extractors.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('com.anisflix.reconstructed/vidzy');
  const embed = 'https://vidzy.org/embed-fixture.html';
  const media = 'https://u14.vidzy.org/hls2/video.m3u8?t=signed&s=123';
  const source = StreamSource(
    embed,
    'Vidzy · VF',
    provider: 'vidzy',
    language: 'VF',
    format: 'embed',
  );
  const page =
      "fetch('https://v6.vidzy.cc/gate.php?'+d);sources:[{src:'$media'}]";
  final messenger =
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  test('gate host discovery is limited to actual Vidzy domains', () {
    expect(
      DirectExtractors.vidzyGateHosts(
        "$page fetch('https://evilvidzy.cc/gate.php?');fetch('https://vidzy.cc.attacker.example/gate.php?')",
      ),
      {'v6.vidzy.cc'},
    );
  });

  test('authorized URL and browser headers reach the Android player', () async {
    messenger.setMockMethodCallHandler(channel, (call) async {
      expect(call.method, 'resolve');
      expect(call.arguments['gateHosts'], ['v6.vidzy.cc']);
      expect(call.arguments['embed'], embed);
      expect(call.arguments['media'], media);
      return {
        'url': '$media&gk=device-session',
        'headers': {
          'User-Agent': 'browser-agent',
          'Referer': 'https://vidzy.org/',
          'Cookie': 'session=fixture',
        },
      };
    });
    final client = MockClient((request) async => http.Response(page, 200));
    final resolved = await DirectExtractors(client).embed(source);
    expect(resolved!.url, '$media&gk=device-session');
    expect(resolved.headers['User-Agent'], 'browser-agent');
    expect(resolved.headers['Cookie'], 'session=fixture');
    expect(resolved.language, 'VF');
    expect(resolved.format, 'hls');
    client.close();
  });

  for (final fails in [false, true]) {
    test(
      'an absent gate key or a failed session cannot fall back to a server token ($fails)',
      () async {
        messenger.setMockMethodCallHandler(channel, (_) async {
          if (fails) throw PlatformException(code: 'vidzy_session');
          return {'url': media};
        });
        SharedPreferences.setMockInitialValues({});
        final library = await Library.load();
        final api = CatalogApi(
          library,
          client: MockClient((request) async {
            expect(
              request.method,
              'GET',
              reason: 'A failed device session must never POST to the server extractor.',
            );
            return http.Response(page, 200);
          }),
        );
        await expectLater(
          api.resolveSource(source),
          throwsA(isA<ApiFailure>()),
        );
        api.close();
      },
    );
  }

  test('a legacy direct page does not request browser authorization', () async {
    messenger.setMockMethodCallHandler(
      channel,
      (_) async => fail('No gate on this page'),
    );
    final client = MockClient((_) async => http.Response("src:'$media'", 200));
    expect((await DirectExtractors(client).embed(source))!.url, media);
    client.close();
  });
}
