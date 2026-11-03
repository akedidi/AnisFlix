import 'dart:async';

import 'package:anisflix_flutter/widgets/cached_media_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_test/flutter_test.dart';

// Widget fixtures have no network or native cache directory. Cache integration
// tests supply a real disk cache instead of this deterministic failure response.
class UnavailableImageCache implements BaseCacheManager {
  @override
  Stream<FileResponse> getFileStream(
    String url, {
    String? key,
    Map<String, String>? headers,
    bool withProgress = false,
  }) => Stream.error(
    NetworkImageLoadException(statusCode: 400, uri: Uri.parse(url)),
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    MediaImageCache.override = UnavailableImageCache();
  });
  tearDown(() {
    MediaImageCache.override = null;
    PaintingBinding.instance.imageCache
      ..clear()
      ..clearLiveImages();
  });
  await testMain();
}
