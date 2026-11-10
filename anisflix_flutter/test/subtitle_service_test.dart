import 'dart:async';
import 'dart:convert';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:anisflix_flutter/services/native_sources.dart';
import 'package:anisflix_flutter/services/subtitle_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

const movie = MediaItem(id: 550, type: 'movie', title: 'Film');
const series = MediaItem(id: 1429, type: 'tv', title: 'L’Attaque des Titans');

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Library library;
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    library.apiKey = 'fixture-key';
  });

  SubtitleService serviceWith(Future<http.Response> Function(http.Request) fn) {
    final service = SubtitleService(library, client: MockClient(fn));
    addTearDown(service.close);
    return service;
  }

  http.Response json(Object value) => http.Response(jsonEncode(value), 200);
  Map<String, String> track(String name, String language) => {
    'id': name,
    'url': 'https://example.com/$name.vtt',
    'lang': language,
  };

  test(
    'movie follows iOS IMDb lookup, keeps language versions and sorts them',
    () async {
      final requests = <Uri>[];
      final service = serviceWith((request) async {
        requests.add(request.url);
        if (request.url.host == 'api.themoviedb.org') {
          expect(request.url.path, '/3/movie/550');
          expect(request.url.queryParameters['api_key'], 'fixture-key');
          return json({'imdb_id': 'tt0137523'});
        }
        expect(request.url.host, 'opensubtitles-v3.strem.io');
        expect(request.url.path, '/subtitles/movie/tt0137523.json');
        return json({
          'subtitles': [
            track('es', 'spa'),
            track('en', 'eng'),
            track('fr1', 'fre'),
            track('de', 'ger'),
            track('fr2', 'fre'),
            track('fr1', 'fre'),
            {'lang': 'fre', 'url': 'file:///tmp/not-remote.srt'},
            {'lang': 'fre', 'url': 'https:///missing-host'},
            {'lang': 'fre'},
            {'url': 'https://example.com/no-language'},
            null,
          ],
        });
      });
      final tracks = await service.load(movie);
      expect(tracks.map((t) => t.language), [
        'fre',
        'fre',
        'eng',
        'ger',
        'spa',
      ]);
      expect(tracks.take(2).map((t) => t.label), ['Français', 'Français']);
      expect(tracks.take(2).map((t) => t.url), [
        'https://example.com/fr1.vtt',
        'https://example.com/fr2.vtt',
      ]);
      expect(await service.load(movie), same(tracks));
      expect(requests.length, 2);
    },
  );

  test(
    'series targets the exact selected episode and isolates the cache',
    () async {
      final paths = <String>[];
      final service = serviceWith((request) async {
        paths.add(request.url.path);
        if (request.url.host == 'api.themoviedb.org') {
          expect(request.url.path, '/3/tv/1429/external_ids');
          return json({'imdb_id': 'tt2560140'});
        }
        return json({
          'subtitles': [track('fr${paths.length}', 'fre')],
        });
      });
      final episode30 = await service.load(series, season: 4, episode: 30);
      final episode29 = await service.load(series, season: 4, episode: 29);
      await service.load(series, season: 0, episode: 1);
      expect(paths.where((p) => p.startsWith('/subtitles/')), [
        '/subtitles/series/tt2560140:4:30.json',
        '/subtitles/series/tt2560140:4:29.json',
        '/subtitles/series/tt2560140:0:1.json',
      ]);
      expect(episode30.single.url, isNot(episode29.single.url));
      expect(
        await service.load(series, season: 4, episode: 30),
        same(episode30),
      );
      expect(paths.length, 6);
    },
  );

  test(
    'incomplete episodes and external media do not fall back to a movie',
    () async {
      final service = serviceWith(
        (_) async => throw StateError('unexpected HTTP'),
      );
      for (final coordinates in [
        (null, null),
        (4, null),
        (null, 30),
        (-1, 1),
        (4, 0),
      ]) {
        expect(
          await service.load(
            series,
            season: coordinates.$1,
            episode: coordinates.$2,
          ),
          isEmpty,
        );
      }
      expect(
        await service.load(
          const MediaItem(id: 1, type: 'external', title: 'URL'),
        ),
        isEmpty,
      );
      expect(
        await service.load(
          const MediaItem(id: 0, type: 'movie', title: 'Invalid'),
        ),
        isEmpty,
      );
      library.apiKey = '';
      expect(await service.load(movie), isEmpty);
    },
  );

  test('missing or invalid IMDb ID never calls OpenSubtitles', () async {
    var calls = 0;
    final service = serviceWith((_) async {
      calls++;
      return json({'imdb_id': calls == 1 ? null : 'invalid/id'});
    });
    expect(await service.load(movie), isEmpty);
    expect(await service.load(movie), isEmpty);
    expect(calls, 2);
  });

  test('concurrent lookups share the same in-flight request', () async {
    var calls = 0;
    final response = Completer<http.Response>();
    final service = serviceWith((request) async {
      calls++;
      if (request.url.host == 'api.themoviedb.org') return response.future;
      return json({
        'subtitles': [track('fr', 'fre')],
      });
    });
    final first = service.load(movie);
    final second = service.load(movie);
    expect(second, same(first));
    response.complete(json({'imdb_id': 'tt0137523'}));
    expect(await first, same(await second));
    expect(calls, 2);
  });

  test('failed and empty responses can be retried', () async {
    var attempts = 0;
    final service = serviceWith((request) async {
      if (request.url.host == 'api.themoviedb.org') {
        return json({'imdb_id': 'tt0137523'});
      }
      attempts++;
      if (attempts == 1) return http.Response('Unavailable', 503);
      return json({
        'subtitles': attempts == 2 ? [] : [track('fr', 'fre')],
      });
    });
    await expectLater(service.load(movie), throwsStateError);
    expect(await service.load(movie), isEmpty);
    expect((await service.load(movie)).single.language, 'fre');
    expect(attempts, 3);
  });

  test(
    'native bridge receives episode coordinates and preserves all versions',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(NativeSources.channel, (call) async {
            expect(call.method, 'subtitles');
            final args = Map<String, dynamic>.from(call.arguments as Map);
            expect(args['id'], 1429);
            expect(args['type'], 'tv');
            expect(args['season'], 4);
            expect(args['episode'], 30);
            expect(args['tmdbKey'], 'fixture-key');
            expect(args['backend'], library.backend);
            return [
              {
                'url': 'https://example.com/fr1.srt',
                'label': 'Français',
                'language': 'fre',
              },
              {
                'url': 'https://example.com/fr2.srt',
                'label': 'Français',
                'language': 'fre',
              },
              {'url': 'file:///tmp/invalid.srt', 'label': 'Invalid'},
            ];
          });
      addTearDown(
        () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
            .setMockMethodCallHandler(NativeSources.channel, null),
      );
      final tracks = await NativeSources(library).subtitles(series, 4, 30);
      expect(tracks.map((t) => t.language), ['fre', 'fre']);
      expect(tracks.map((t) => t.url), [
        'https://example.com/fr1.srt',
        'https://example.com/fr2.srt',
      ]);
    },
  );
}
