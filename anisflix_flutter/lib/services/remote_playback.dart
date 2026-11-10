import 'dart:async';
import 'dart:io';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';

import '../models/media.dart';
import 'platform_bridge.dart';

/// One remote session for the current player; local playback is paused only
/// after the receiver has accepted the media load.
class RemotePlayback extends ChangeNotifier {
  Future<void>? _initializing;
  StreamSubscription<GoogleCastSession?>? _session;
  StreamSubscription<GoggleCastMediaStatus?>? _status;
  StreamSubscription<Duration>? _position;
  Timer? _airPlayPoll;
  bool _polling = false;
  Map<String, dynamic>? airPlayDevice;
  bool casting = false;
  bool initialized = false;
  bool _closed = false;
  bool playing = false;
  Duration position = Duration.zero;
  Duration duration = Duration.zero;
  bool get active => casting || airPlayDevice != null;
  final VoidCallback onDisconnected;

  RemotePlayback({required this.onDisconnected});

  Future<void> initializeCast() => _initializing ??= _initializeCast();
  Future<void> _initializeCast() async {
    try {
      await GoogleCastContext.instance.setSharedInstanceWithOptions(
        GoogleCastOptionsAndroid(
          appId: GoogleCastDiscoveryCriteria.kDefaultApplicationId,
          stopCastingOnAppTerminated: true,
        ),
      );
      if (_closed) throw StateError('Lecteur fermé.');
      initialized = true;
      _session = GoogleCastSessionManager.instance.currentSessionStream.listen((
        session,
      ) {
        if (casting &&
            GoogleCastSessionManager.instance.connectionState ==
                GoogleCastConnectState.disconnected) {
          casting = false;
          notifyListeners();
          onDisconnected();
        }
      });
      _status = GoogleCastRemoteMediaClient.instance.mediaStatusStream.listen((
        status,
      ) {
        if (!casting || status == null) return;
        if (status.idleReason == GoogleCastMediaIdleReason.error) {
          casting = false;
          notifyListeners();
          onDisconnected();
          return;
        }
        playing = status.playerState == CastMediaPlayerState.playing;
        duration = status.mediaInformation?.duration ?? duration;
        notifyListeners();
      });
      _position = GoogleCastRemoteMediaClient.instance.playerPositionStream
          .listen((value) {
            if (!casting) return;
            position = value;
            notifyListeners();
          });
    } catch (_) {
      _initializing = null;
      rethrow;
    }
  }

  Future<void> castTo(
    GoogleCastDevice device,
    StreamSource source,
    String title,
    Duration start,
    Duration total,
  ) async {
    _requireNetworkSource(source);
    await initializeCast();
    final manager = GoogleCastSessionManager.instance;
    if (manager.hasConnectedSession &&
        manager.currentSession?.device?.deviceID != device.deviceID) {
      await manager.endSessionAndStopCasting();
      if (manager.hasConnectedSession) {
        await manager.currentSessionStream
            .firstWhere((_) => !manager.hasConnectedSession)
            .timeout(const Duration(seconds: 10));
      }
    }
    if (!manager.hasConnectedSession &&
        !await manager.startSessionWithDevice(device)) {
      throw StateError('Connexion Chromecast impossible.');
    }
    if (!manager.hasConnectedSession) {
      await manager.currentSessionStream
          .firstWhere((_) => manager.hasConnectedSession)
          .timeout(const Duration(seconds: 20));
    }
    final url = Uri.parse(source.url);
    await GoogleCastRemoteMediaClient.instance.loadMedia(
      GoogleCastMediaInformation(
        contentId: source.url,
        contentUrl: url,
        streamType: CastMediaStreamType.buffered,
        contentType: url.path.toLowerCase().contains('.m3u8')
            ? 'application/x-mpegURL'
            : 'video/mp4',
        metadata: GoogleCastMovieMediaMetadata(title: title),
        duration: total > Duration.zero ? total : null,
      ),
      playPosition: start,
    );
    if (_closed) {
      await manager.endSessionAndStopCasting();
      throw StateError('Lecteur fermé.');
    }
    casting = true;
    playing = true;
    position = start;
    duration = total;
    if (!_closed) notifyListeners();
  }

  Future<void> airPlayTo(
    Map<String, dynamic> device,
    StreamSource source,
    Duration start,
    Duration total,
  ) async {
    _requireNetworkSource(source);
    // AirPlay's HTTP video endpoint accepts a URL and a fractional start time.
    // Receivers requiring pairing return an error; never report them connected.
    await _airPlayRequest(
      device,
      '/play',
      body:
          'Content-Location: ${source.url}\r\nStart-Position: ${total.inMilliseconds > 0 ? start.inMilliseconds / total.inMilliseconds : 0}\r\n',
    );
    if (_closed) {
      await _airPlayRequest(device, '/stop');
      throw StateError('Lecteur fermé.');
    }
    airPlayDevice = device;
    playing = true;
    position = start;
    duration = total;
    if (_closed) return;
    _airPlayPoll?.cancel();
    _airPlayPoll = Timer.periodic(
      const Duration(seconds: 2),
      (_) => unawaited(_pollAirPlay()),
    );
    notifyListeners();
  }

  void _requireNetworkSource(StreamSource source) {
    if (!['http', 'https'].contains(Uri.tryParse(source.url)?.scheme)) {
      throw StateError(
        'La diffusion nécessite une source accessible sur le réseau.',
      );
    }
  }

  Future<void> _pollAirPlay() async {
    final device = airPlayDevice;
    if (_closed || _polling || device == null) return;
    _polling = true;
    try {
      final text = await _airPlayRequest(device, '/scrub', get: true);
      if (_closed || !identical(device, airPlayDevice)) return;
      double? seconds(String field) => double.tryParse(
        RegExp('$field: ([0-9.]+)').firstMatch(text)?.group(1) ?? '',
      );
      final current = seconds('position');
      final total = seconds('duration');
      if (current != null && current.isFinite) {
        position = Duration(milliseconds: (current * 1000).round());
      }
      if (total != null && total.isFinite) {
        duration = Duration(milliseconds: (total * 1000).round());
      }
      notifyListeners();
    } catch (_) {
      // A transient status request must not interrupt receiver playback.
    } finally {
      _polling = false;
    }
  }

  Future<String> _airPlayRequest(
    Map<String, dynamic> device,
    String path, {
    String? body,
    bool get = false,
  }) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final uri = Uri(
        scheme: 'http',
        host: '${device['host']}',
        port: device['port'] as int,
      ).resolve(path);
      final request = get
          ? await client.getUrl(uri)
          : await client.postUrl(uri);
      request.headers.set('User-Agent', 'MediaControl/1.0');
      if (body != null) {
        request.headers.set('Content-Type', 'text/parameters');
        request.write(body);
      }
      final response = await request.close().timeout(
        const Duration(seconds: 10),
      );
      final result = await utf8.decoder.bind(response).join();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw HttpException('AirPlay ${response.statusCode}');
      }
      return result;
    } finally {
      client.close(force: true);
    }
  }

  Future<void> playOrPause() async {
    if (casting) {
      if (playing) {
        await GoogleCastRemoteMediaClient.instance.pause();
      } else {
        await GoogleCastRemoteMediaClient.instance.play();
      }
    } else if (airPlayDevice case final device?) {
      await _airPlayRequest(device, '/rate?value=${playing ? 0 : 1}');
    }
    playing = !playing;
    notifyListeners();
  }

  Future<void> seek(Duration target) async {
    if (casting) {
      await GoogleCastRemoteMediaClient.instance.seek(
        GoogleCastMediaSeekOption(
          position: target,
          resumeState: playing
              ? GoogleCastMediaResumeState.play
              : GoogleCastMediaResumeState.pause,
        ),
      );
    } else if (airPlayDevice case final device?) {
      await _airPlayRequest(
        device,
        '/scrub?position=${target.inMilliseconds / 1000}',
      );
    }
    position = target;
    notifyListeners();
  }

  Future<void> disconnect() async {
    _airPlayPoll?.cancel();
    if (casting) {
      await GoogleCastSessionManager.instance.endSessionAndStopCasting();
    }
    if (airPlayDevice case final device?) {
      await _airPlayRequest(device, '/stop');
    }
    casting = false;
    airPlayDevice = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _closed = true;
    _airPlayPoll?.cancel();
    unawaited(_session?.cancel());
    unawaited(_status?.cancel());
    unawaited(_position?.cancel());
    // Closing the player ends its receiver session too.
    if (casting) {
      unawaited(
        GoogleCastSessionManager.instance.endSessionAndStopCasting().then<void>(
          (_) {},
          onError: (Object _) {},
        ),
      );
    }
    if (airPlayDevice case final device?) {
      unawaited(
        _airPlayRequest(
          device,
          '/stop',
        ).then<void>((_) {}, onError: (Object _) {}),
      );
    }
    unawaited(PlatformBridge.stopAirPlayDiscovery());
    super.dispose();
  }
}
