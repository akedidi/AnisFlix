import 'dart:io';

import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/downloads.dart';
import 'package:anisflix_flutter/services/library.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Library library;
  late Directory folder;
  const movie = MediaItem(id: 17, type: 'movie', title: 'Test');
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    library = await Library.load();
    folder = await Directory.systemTemp.createTemp('anisflix-download-');
    Downloads.errors.clear();
  });
  tearDown(() async {
    await folder.delete(recursive: true);
  });
  test('HLS master downloads selected video and separate audio without remote references', () async {
    final client = MockClient((request) async {
      final path = request.url.path;
      final text = switch (path) {
        '/master.m3u8' => '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",DEFAULT=YES,URI="audio.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=100,AUDIO="a"\nvideo.m3u8\n',
        '/video.m3u8' => '#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\nvideo.ts\n#EXT-X-ENDLIST\n',
        '/audio.m3u8' => '#EXTM3U\n#EXT-X-TARGETDURATION:2\n#EXTINF:2,\naudio.ts\n#EXT-X-ENDLIST\n',
        _ => 'segment',
      };
      return http.Response(
        text,
        200,
        headers: {
          'content-type': path.endsWith('m3u8')
              ? 'application/vnd.apple.mpegurl'
              : 'video/mp2t',
        },
      );
    });
    await Downloads.start(
      library,
      movie,
      const StreamSource('https://example.test/master.m3u8', 'HLS'),
      storageDirectory: folder,
      client: client,
    );
    expect(library.downloads.length, 1);
    final entry = library.downloads.single;
    final playlists = await Directory(entry['directory'] as String)
        .list()
        .where((f) => f.path.endsWith('.m3u8'))
        .toList();
    expect(playlists.length, 3);
    for (final file in playlists) {
      final text = await File(file.path).readAsString();
      expect(text, isNot(contains('https://')));
    }
    expect(
      await File(entry['path'] as String).readAsString(),
      contains('GROUP-ID="offline"'),
    );
    await Downloads.remove(library, entry);
    expect(await Directory(entry['directory'] as String).exists(), false);
  });
  test('HLS preserves AES IV, local keys and byte ranges without duplicating range directives', () async {
    final client = MockClient((request) async {
      if (request.url.path.endsWith('.m3u8')) {
        return http.Response(
          '#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:7\n#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x00000000000000000000000000000001\n#EXTINF:1,\n#EXT-X-BYTERANGE:4@2\nmovie.ts\n#EXT-X-ENDLIST\n',
          200,
          headers: {'content-type': 'application/vnd.apple.mpegurl'},
        );
      }
      if (request.url.path == '/key') {
        return http.Response('0123456789abcdef', 200);
      }
      expect(request.headers['Range'], 'bytes=2-5');
      return http.Response('data', 206);
    });
    await Downloads.start(
      library,
      movie,
      const StreamSource('https://example.test/media.m3u8', 'HLS'),
      storageDirectory: folder,
      client: client,
    );
    final playlist = await File(library.downloads.single['path'] as String)
        .readAsString();
    expect(playlist, contains('#EXT-X-MEDIA-SEQUENCE:7'));
    expect(playlist, contains('IV=0x00000000000000000000000000000001'));
    expect(playlist, isNot(contains('BYTERANGE')));
    expect(playlist, isNot(contains('URI="key"')));
  });
  test('DASH expands formatted template numbers and a bounded negative timeline repeat', () async {
    final paths = <String>[];
    final client = MockClient((request) async {
      paths.add(request.url.path);
      if (request.url.path.endsWith('.mpd')) {
        return http.Response(
          r'''<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT6S"><BaseURL>media/</BaseURL><Period><AdaptationSet mimeType="video/mp4"><SegmentTemplate timescale="1" initialization="init-$RepresentationID$.mp4" media="chunk-$Number%05d$.m4s"><SegmentTimeline><S t="0" d="2" r="-1"/></SegmentTimeline></SegmentTemplate><Representation id="low" bandwidth="100"/><Representation id="high" bandwidth="900"/></AdaptationSet></Period></MPD>''',
          200,
          headers: {'content-type': 'application/dash+xml'},
        );
      }
      return http.Response('segment', 200);
    });
    await Downloads.start(
      library,
      movie,
      const StreamSource('https://example.test/movie.mpd', 'DASH'),
      storageDirectory: folder,
      client: client,
    );
    expect(
      paths,
      containsAll([
        '/media/init-high.mp4',
        '/media/chunk-00001.m4s',
        '/media/chunk-00002.m4s',
        '/media/chunk-00003.m4s',
      ]),
    );
    final manifest = await File(library.downloads.single['path'] as String)
        .readAsString();
    expect(manifest, contains('SegmentList'));
    expect(manifest, isNot(contains('SegmentTemplate')));
    expect(manifest, isNot(contains('<BaseURL>')));
  });
  test('failed replacement preserves the previous download and cleans staging data', () async {
    final existing = File('${folder.path}/existing.mp4');
    await existing.writeAsString('existing');
    library.downloads.add({
      'id': 'movie-17-0-0',
      'media': movie.toJson(),
      'path': existing.path,
    });
    final client = MockClient((_) async => http.Response('error', 503));
    await expectLater(
      Downloads.start(
        library,
        movie,
        const StreamSource('https://example.test/movie.mp4', 'MP4'),
        storageDirectory: folder,
        client: client,
      ),
      throwsA(isA<HttpException>()),
    );
    expect(await existing.exists(), true);
    expect(library.downloads.single['path'], existing.path);
    expect(await folder.list().length, 1);
    expect(Downloads.active, isEmpty);
  });
  test(
    'cancellation removes partial files and does not publish an offline entry',
    () async {
      final client = MockClient((request) async {
        if (request.url.path.endsWith('.m3u8')) {
          return http.Response(
            '#EXTM3U\n#EXTINF:1,\npart.ts\n#EXT-X-ENDLIST\n',
            200,
            headers: {'content-type': 'application/vnd.apple.mpegurl'},
          );
        }
        Downloads.active.values.single.cancel();
        return http.Response('data', 200);
      });
      await expectLater(
        Downloads.start(
          library,
          movie,
          const StreamSource('https://example.test/movie.m3u8', 'HLS'),
          storageDirectory: folder,
          client: client,
        ),
        throwsA(isA<StateError>()),
      );
      expect(library.downloads, isEmpty);
      expect(await folder.list().length, 0);
      expect(Downloads.active, isEmpty);
      expect(Downloads.errors, isEmpty);
    },
  );
  test('live HLS and protected DASH fail explicitly without leaving incomplete entries', () async {
    for (final dash in [false, true]) {
      final client = MockClient(
        (_) async => http.Response(
          dash
              ? '<MPD type="static"><Period><AdaptationSet><ContentProtection/></AdaptationSet></Period></MPD>'
              : '#EXTM3U\n#EXTINF:6,\na.ts\n',
          200,
          headers: {
            'content-type': dash
                ? 'application/dash+xml'
                : 'application/vnd.apple.mpegurl',
          },
        ),
      );
      await expectLater(
        Downloads.start(
          library,
          movie,
          StreamSource(
            'https://example.test/movie.${dash ? 'mpd' : 'm3u8'}',
            'Video',
          ),
          storageDirectory: folder,
          client: client,
        ),
        throwsA(isA<StateError>()),
      );
    }
    expect(library.downloads, isEmpty);
    expect(await folder.list().length, 0);
  });
}
