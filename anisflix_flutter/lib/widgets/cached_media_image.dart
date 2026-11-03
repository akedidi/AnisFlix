import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// One disk cache shared by posters, backdrops, logos and episode stills.
class MediaImageCache {
  static const key = 'anisflix-images-v1';
  static const stalePeriod = Duration(days: 30);
  static const maxImages = 500;
  static final CacheManager instance = CacheManager(
    Config(key, stalePeriod: stalePeriod, maxNrOfCacheObjects: maxImages),
  );

  @visibleForTesting
  static BaseCacheManager? override;

  static Future<void> clear() async {
    await (override ?? instance).emptyCache();
    PaintingBinding.instance.imageCache
      ..clear()
      ..clearLiveImages();
  }
}

class CachedMediaImage extends StatelessWidget {
  final String url;
  final BoxFit? fit;
  final AlignmentGeometry alignment;
  final double? width, height;
  final bool excludeFromSemantics;
  final ImageErrorWidgetBuilder? errorBuilder;

  const CachedMediaImage(
    this.url, {
    super.key,
    this.fit,
    this.alignment = Alignment.center,
    this.width,
    this.height,
    this.excludeFromSemantics = false,
    this.errorBuilder,
  });

  @override
  Widget build(BuildContext context) => Image(
    image: CachedNetworkImageProvider(
      url,
      cacheManager: MediaImageCache.override ?? MediaImageCache.instance,
    ),
    fit: fit,
    alignment: alignment,
    width: width,
    height: height,
    excludeFromSemantics: excludeFromSemantics,
    errorBuilder: errorBuilder,
  );
}
