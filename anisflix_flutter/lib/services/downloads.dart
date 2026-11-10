import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../models/media.dart';
import 'dash_download.dart';
import 'download_transport.dart';
import 'hls_download.dart';
import 'library.dart';
import 'platform_bridge.dart';

class DownloadJob {
  final String id, title;
  final http.Client client;
  int received = 0, total = 0, segments = 0, segmentCount = 0;
  bool cancelled = false, backgroundSupported = true;
  DownloadJob(this.id, this.title, this.client);
  double? get progress => segmentCount > 0
      ? segments / segmentCount
      : total > 0
      ? received / total
      : null;
  void cancel() {
    cancelled = true;
    client.close();
  }
}

class Downloads {
  static final Map<String, DownloadJob> active = {};
  static final Map<String, String> errors = {};
  static final changes = ValueNotifier(0);
  static Future<bool> _notification = Future.value(true);
  static Future<bool> updateNotification(int count, double? progress) {
    return _notification = _notification
        .then((_) => PlatformBridge.downloads(count: count, progress: progress))
        .catchError((_) => false);
  }

  static DateTime lastUpdate = DateTime.fromMillisecondsSinceEpoch(0);
  static void notify({bool force = false}) {
    if (!force && DateTime.now().difference(lastUpdate).inMilliseconds < 500) {
      return;
    }
    lastUpdate = DateTime.now();
    changes.value++;
    final known = active.values.every((j) => j.progress != null);
    final ratio = active.isNotEmpty && known
        ? active.values.map((j) => j.progress!).reduce((a, b) => a + b) /
              active.length
        : null;
    unawaited(updateNotification(active.length, ratio));
  }

  static Future<Directory> root() => getApplicationSupportDirectory().then(
    (d) => Directory('${d.path}/media'),
  );
  static Future<void> cleanupInterrupted({Directory? storageDirectory}) async {
    final folder = storageDirectory ?? await root();
    if (!await folder.exists()) return;
    await for (final entity in folder.list()) {
      if (entity.path.endsWith('.part')) {
        try {
          await entity.delete(recursive: true);
        } on FileSystemException {
          /* Retry on the next launch. */
        }
      }
    }
  }

  static Future<void> start(
    Library library,
    MediaItem item,
    StreamSource source, {
    int? season,
    int? episode,
    Directory? storageDirectory,
    http.Client? client,
  }) async {
    final id = '${item.type}-${item.id}-${season ?? 0}-${episode ?? 0}'
        .replaceAll(RegExp('[^a-zA-Z0-9_-]'), '_');
    if (active.containsKey(id)) {
      throw StateError('Ce téléchargement est déjà en cours.');
    }
    final job = DownloadJob(id, item.title, client ?? http.Client());
    active[id] = job;
    errors.remove(id);
    PlatformBridge.cancelDownloads = () {
      for (final task in active.values.toList()) {
        task.cancel();
      }
    };
    changes.value++;
    Directory? partial, completed;
    var committed = false;
    final previous = library.downloads.where((d) => d['id'] == id).toList();
    try {
      job.backgroundSupported = await updateNotification(active.length, null);
      final folder = storageDirectory ?? await root();
      await folder.create(recursive: true);
      final name = '$id-${DateTime.now().microsecondsSinceEpoch}';
      partial = Directory('${folder.path}/$name.part');
      await partial.create();
      final transport = DownloadTransport(
        client: job.client,
        headers: source.headers,
        cancelled: () => job.cancelled,
        onLength: (n) {
          if (job.segmentCount == 0) job.total = n ?? 0;
        },
        onBytes: (n) {
          job.received += n;
          notify();
        },
      );
      final uri = Uri.parse(source.url),
          mime = await transport.mediaType(Uri.parse(source.url));
      final String filename;
      void planned(int n) {
        job.segmentCount += n;
        notify(force: true);
      }

      void segment() {
        job.segments++;
        notify(force: true);
      }

      if (['hls', 'm3u8'].contains(source.format) ||
          uri.path.endsWith('.m3u8') ||
          mime.contains('mpegurl')) {
        filename = await HlsDownloader(
          transport: transport,
          directory: partial,
          onPlanned: planned,
          onSegment: segment,
        ).download(uri);
      } else if (['dash', 'mpd'].contains(source.format) ||
          uri.path.endsWith('.mpd') ||
          mime.contains('dash+xml')) {
        filename = await DashDownloader(
          transport: transport,
          directory: partial,
          onPlanned: planned,
          onSegment: segment,
        ).download(uri);
      } else {
        if (source.format.toLowerCase() != 'mp4' &&
            !mime.contains('video/mp4') &&
            !uri.path.toLowerCase().endsWith('.mp4')) {
          throw StateError('Ce format vidéo n’est pas téléchargeable.');
        }
        filename = 'video.mp4';
        await transport.file(uri, File('${partial.path}/$filename'));
      }
      transport.checkCancelled();
      completed = await partial.rename('${folder.path}/$name');
      partial = null;
      final entry = {
        'id': id,
        'media': item.toJson(),
        'season': season,
        'episode': episode,
        'path': '${completed.path}/$filename',
        'directory': completed.path,
      };
      library.downloads.removeWhere((d) => d['id'] == id);
      library.downloads.add(entry);
      try {
        await library.saveDownloads();
      } catch (_) {
        library.downloads.remove(entry);
        library.downloads.addAll(previous);
        rethrow;
      }
      committed = true;
      for (final old in previous) {
        try {
          await deleteFiles(old);
        } on FileSystemException {
          /* The new download remains usable. */
        }
      }
    } catch (e) {
      if (!job.cancelled) {
        errors[id] = e is StateError
            ? e.message
            : 'Le téléchargement a échoué. Réessaie.';
      }
      rethrow;
    } finally {
      job.client.close();
      active.remove(id);
      try {
        if (partial != null && await partial.exists()) {
          await partial.delete(recursive: true);
        }
        if (!committed && completed != null && await completed.exists()) {
          await completed.delete(recursive: true);
        }
      } on FileSystemException {
        // Interrupted staging files are retried during the next launch.
      } finally {
        notify(force: true);
      }
    }
  }

  static Future<void> deleteFiles(Map<String, dynamic> entry) async {
    final directory = entry['directory'];
    if (directory is String) {
      final folder = Directory(directory);
      if (await folder.exists()) await folder.delete(recursive: true);
    } else {
      final file = File(entry['path'] as String);
      if (await file.exists()) await file.delete();
    }
  }

  static Future<void> remove(
    Library library,
    Map<String, dynamic> entry,
  ) async {
    await deleteFiles(entry);
    library.downloads.remove(entry);
    await library.saveDownloads();
  }
}
