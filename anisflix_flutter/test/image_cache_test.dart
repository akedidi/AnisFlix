import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:anisflix_flutter/widgets/cached_media_image.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const pathChannel = MethodChannel('plugins.flutter.io/path_provider');
  final png = base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=',
  );
  late Directory directory;
  final managers = <CacheManager>[];
  final clients = <http.Client>[];

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('anisflix-image-cache-');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathChannel, (_) async => directory.path);
  });

  tearDown(() async {
    for (final manager in managers) {
      await manager.dispose();
    }
    managers.clear();
    for (final client in clients) {
      client.close();
    }
    clients.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(pathChannel, null);
    await directory.delete(recursive: true);
  });

  CacheManager cache(http.Client client) {
    clients.add(client);
    final manager = CacheManager(
      Config(
        MediaImageCache.key,
        stalePeriod: MediaImageCache.stalePeriod,
        maxNrOfCacheObjects: MediaImageCache.maxImages,
        repo: JsonCacheInfoRepository.withFile(
          File('${directory.path}/images.json'),
        ),
        fileService: HttpFileService(httpClient: client),
      ),
    );
    managers.add(manager);
    return manager;
  }

  Future<void> loadImage(CacheManager manager, String url) async {
    final stream = CachedNetworkImageProvider(
      url,
      cacheManager: manager,
    ).resolve(ImageConfiguration.empty);
    final loaded = Completer<void>();
    final listener = ImageStreamListener(
      (info, _) {
        expect(info.image.width, 1);
        expect(info.image.height, 1);
        info.dispose();
        loaded.complete();
      },
      onError: (Object error, StackTrace? stack) =>
          loaded.completeError(error, stack),
    );
    stream.addListener(listener);
    try {
      await loaded.future;
    } finally {
      stream.removeListener(listener);
    }
  }

  test(
    'images decode from disk after restart without another network request',
    () async {
      var requests = 0;
      var offline = false;
      final client = MockClient((request) async {
        requests++;
        if (offline) throw http.ClientException('offline');
        return http.Response.bytes(
          png,
          200,
          headers: {
            'content-type': 'image/png',
            'cache-control': 'public, max-age=86400',
          },
        );
      });
      const url = 'https://image.tmdb.org/t/p/w300/episode.jpg';
      final first = cache(client);
      await loadImage(first, url);
      expect(requests, 1);
      expect(
        await (await first.getFileFromCache(url))!.file.readAsBytes(),
        png,
      );
      await first.dispose();
      managers.remove(first);
      PaintingBinding.instance.imageCache
        ..clear()
        ..clearLiveImages();
      offline = true;
      final restarted = cache(client);
      await loadImage(restarted, url);
      expect(requests, 1);
      expect((await restarted.getFileFromCache(url))!.source, FileSource.Cache);
    },
  );

  test(
    'clearing the shared cache evicts disk images and reloads them',
    () async {
      var requests = 0;
      final manager = cache(
        MockClient((request) async {
          requests++;
          return http.Response.bytes(
            png,
            200,
            headers: {'content-type': 'image/png'},
          );
        }),
      );
      MediaImageCache.override = manager;
      addTearDown(() => MediaImageCache.override = null);
      const url = 'https://image.tmdb.org/t/p/w300/cached.jpg';
      await loadImage(manager, url);
      expect(PaintingBinding.instance.imageCache.currentSize, greaterThan(0));
      await MediaImageCache.clear();
      expect(await manager.getFileFromCache(url), isNull);
      expect(PaintingBinding.instance.imageCache.currentSize, 0);
      await loadImage(manager, url);
      expect(requests, 2);
    },
  );

  test('failed images are retried and do not poison the disk cache', () async {
    var requests = 0;
    final manager = cache(
      MockClient((request) async {
        requests++;
        return requests == 1
            ? http.Response('unavailable', 503)
            : http.Response.bytes(
                png,
                200,
                headers: {'content-type': 'image/png'},
              );
      }),
    );
    const url = 'https://image.tmdb.org/t/p/w500/poster.jpg';
    await expectLater(
      manager.getSingleFile(url),
      throwsA(isA<HttpExceptionWithStatus>()),
    );
    expect(await manager.getFileFromCache(url), isNull);
    final file = await manager.getSingleFile(url);
    expect(await file.readAsBytes(), png);
    expect(requests, 2);
  });
}
