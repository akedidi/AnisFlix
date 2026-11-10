import 'dart:convert';
import 'dart:io';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/native_sources.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/source_list_policy.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('Flutter language buckets, ordering and labels match actual iOS Swift output', () {
    final fixture = (jsonDecode(
      File('recovery/ios-source-list-reference.json').readAsStringSync(),
    ) as List).cast<Map<String, dynamic>>();
    final sources = fixture
        .map((r) => StreamSource.parse(r, 'fixture')!)
        .toList()
        .reversed
        .toList();
    for (final language in SourceListPolicy.languages) {
      final expected = fixture.where((r) => r['bucket'] == language).toList();
      final actual = SourceListPolicy.forLanguage(sources, language);
      expect(actual.map((s) => s.url), expected.map((r) => r['url']));
      for (var i = 0; i < actual.length; i++) {
        expect(
          SourceListPolicy.display(actual[i], actual),
          expected[i]['display'],
        );
      }
    }
  });
  test(
    'native bridge preserves the iOS source entries and every provider',
    () async {
      SharedPreferences.setMockInitialValues({});
      final library = await Library.load();
      library.apiKey = 'fixture-key';
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(NativeSources.channel, (call) async {
            expect(call.method, 'sources');
            final args = Map<String, dynamic>.from(call.arguments as Map);
            expect(args['type'], 'tv');
            expect(args['season'], 2);
            expect(args['episode'], 3);
            return [
              {
                'url': 'https://example.com/moviebox.mp4',
                'provider': 'moviebox',
                'language': 'VO',
                'quality': '1080p',
                'type': 'mp4',
                'headers': {'Referer': 'https://example.com/'},
                'tracks': [
                  {
                    'url': 'https://example.com/fr.vtt',
                    'label': 'Français',
                    'language': 'fr',
                  },
                ],
              },
              {
                'url': 'https://example.com/mob.mp4',
                'provider': 'mob',
                'language': 'VO',
                'quality': '1080p',
                'type': 'mp4',
              },
            ];
          });
      addTearDown(
        () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(NativeSources.channel, null),
      );
      final rows = await NativeSources(library)
          .load(const MediaItem(id: 42, type: 'tv', title: 'Série'), 2, 3);
      expect(rows.map((s) => s.provider), ['moviebox', 'mob']);
      expect(rows.first.headers['Referer'], 'https://example.com/');
      expect(rows.first.subtitles.single.language, 'fr');
      expect(rows.first.languageGroup, 'VO');
    },
  );
}
