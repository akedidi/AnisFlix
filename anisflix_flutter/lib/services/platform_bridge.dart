import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class PlatformBridge {
  static const channel = MethodChannel('com.anisflix.reconstructed/platform');
  static final pictureInPicture = ValueNotifier(false);
  static bool deviceIsTv = false;
  static VoidCallback? cancelDownloads;
  static bool get android => !kIsWeb && Platform.isAndroid;
  static bool get supportsPip => android && !deviceIsTv;
  static Future<void> initialize() async {
    if (!android) return;
    channel.setMethodCallHandler((call) async {
      if (call.method == 'pictureInPictureChanged') {
        pictureInPicture.value = call.arguments == true;
      }
      if (call.method == 'cancelDownloads') cancelDownloads?.call();
    });
    deviceIsTv = await _invoke<bool>('isTv') ?? false;
  }

  static Future<T?> _invoke<T>(
    String method, [
    Map<String, dynamic>? arguments,
  ]) async {
    if (!android) return null;
    try {
      return await channel.invokeMethod<T>(method, arguments);
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }

  static Future<bool> enterPip() async =>
      await _invoke<bool>('enterPictureInPicture') ?? false;
  static Future<void> playbackActive(bool active) async =>
      _invoke<void>('setPlaybackActive', {'active': active});
  static Future<bool> downloads({
    required int count,
    required double? progress,
  }) async =>
      await _invoke<bool>('downloadForeground', {
        'count': count,
        'progress': progress,
      }) ??
      !android;
}
