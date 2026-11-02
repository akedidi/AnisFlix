import 'dart:io';

import 'package:flutter/services.dart';

import '../models/media.dart';
import 'library.dart';

class NativeSources {
  static const channel = MethodChannel('com.anisflix.reconstructed/sources');
  static bool get supported => Platform.isMacOS;
  final Library library;
  NativeSources(this.library);
  Future<List<StreamSource>> load(
    MediaItem item,
    int? season,
    int? episode,
  ) async {
    final rows = await channel.invokeListMethod<dynamic>('sources', {
      'id': item.id,
      'type': item.type,
      'season': season,
      'episode': episode,
      'tmdbKey': library.apiKey,
      'backend': library.backend,
    });
    return [
      for (final row in rows ?? [])
        if (StreamSource.parse(Map<String, dynamic>.from(row as Map), 'native')
            case final StreamSource source)
          source,
    ];
  }

  Future<StreamSource?> resolve(StreamSource source) async {
    final row = await channel.invokeMapMethod<String, dynamic>('resolve', {
      'url': source.url,
      'quality': source.quality,
      'format': source.format,
      'provider': source.provider,
      'language': source.language,
      'headers': source.headers,
      'tmdbKey': library.apiKey,
      'backend': library.backend,
    });
    return row == null ? null : StreamSource.parse(row, source.provider);
  }
}
