import 'dart:io';

import 'download_transport.dart';

Map<String, String> hlsAttributes(String line) {
  final result = <String, String>{};
  for (final match in RegExp(
    r'''([A-Z0-9-]+)=("[^"]*"|[^,]*)''',
  ).allMatches(line)) {
    final value = match.group(2)!;
    result[match.group(1)!] = value.startsWith('"')
        ? value.substring(1, value.length - 1)
        : value;
  }
  return result;
}

class HlsDownloader {
  final DownloadTransport transport;
  final Directory directory;
  final void Function(int total) onPlanned;
  final void Function() onSegment;
  int serial = 0;
  final Map<String, String> resources = {};
  HlsDownloader({
    required this.transport,
    required this.directory,
    required this.onPlanned,
    required this.onSegment,
  });
  Future<String> download(
    Uri uri, {
    String filename = 'index.m3u8',
    int depth = 0,
  }) async {
    if (depth > 4) {
      throw StateError('La liste de lecture contient trop de redirections.');
    }
    final text = await transport.text(uri);
    final lines = text
        .split(RegExp(r'\r?\n'))
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .toList();
    if (lines.isEmpty || lines.first != '#EXTM3U') {
      throw StateError('Liste HLS invalide.');
    }
    final variants = <({Map<String, String> attributes, Uri uri})>[];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXT-X-STREAM-INF:')) {
        var next = i + 1;
        while (next < lines.length && lines[next].startsWith('#')) {
          next++;
        }
        if (next >= lines.length) throw StateError('Variante HLS incomplète.');
        variants.add((
          attributes: hlsAttributes(lines[i]),
          uri: uri.resolve(lines[next]),
        ));
      }
    }
    if (variants.isNotEmpty) {
      variants.sort(
        (a, b) => (int.tryParse(b.attributes['BANDWIDTH'] ?? '0') ?? 0)
            .compareTo(int.tryParse(a.attributes['BANDWIDTH'] ?? '0') ?? 0),
      );
      final selected = variants.first;
      final video = await download(
        selected.uri,
        filename: 'video-${serial++}.m3u8',
        depth: depth + 1,
      );
      final audio =
          lines
              .where((line) => line.startsWith('#EXT-X-MEDIA:'))
              .map(hlsAttributes)
              .where(
                (a) =>
                    a['TYPE'] == 'AUDIO' &&
                    a['GROUP-ID'] == selected.attributes['AUDIO'] &&
                    a['URI'] != null,
              )
              .toList()
            ..sort(
              (a, b) => (b['DEFAULT'] == 'YES' ? 1 : 0).compareTo(
                a['DEFAULT'] == 'YES' ? 1 : 0,
              ),
            );
      String? audioFile;
      if (audio.isNotEmpty) {
        audioFile = await download(
          uri.resolve(audio.first['URI']!),
          filename: 'audio-${serial++}.m3u8',
          depth: depth + 1,
        );
      }
      final output = [
        '#EXTM3U',
        '#EXT-X-VERSION:7',
        if (audioFile != null)
          '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="offline",NAME="Audio",DEFAULT=YES,AUTOSELECT=YES,URI="$audioFile"',
        '#EXT-X-STREAM-INF:BANDWIDTH=${selected.attributes['BANDWIDTH'] ?? '1000000'}${audioFile == null ? '' : ',AUDIO="offline"'}',
        video,
      ];
      await File('${directory.path}/$filename')
          .writeAsString('${output.join('\n')}\n');
      return filename;
    }
    if (!lines.contains('#EXT-X-ENDLIST')) {
      throw StateError(
        'Le téléchargement hors ligne des flux en direct n’est pas disponible.',
      );
    }
    final count = lines.where((line) => !line.startsWith('#')).length;
    if (count == 0) throw StateError('La liste HLS ne contient aucun segment.');
    if (count > 20000) throw StateError('La vidéo contient trop de segments.');
    onPlanned(count);
    final output = <String>[];
    String? byteRange;
    int previousEnd = 0;
    bool fragmented = false;
    Uri? previousUri;
    for (final line in lines) {
      transport.checkCancelled();
      if (line.startsWith('#EXT-X-BYTERANGE:')) {
        byteRange = line.substring('#EXT-X-BYTERANGE:'.length);
        continue;
      }
      if (line.startsWith('#EXT-X-KEY:')) {
        final attrs = hlsAttributes(line),
            method = hlsAttributes(line)['METHOD'];
        if (method == 'NONE') {
          output.add(line);
          continue;
        }
        if (method != 'AES-128' ||
            (attrs['KEYFORMAT'] != null && attrs['KEYFORMAT'] != 'identity') ||
            attrs['URI'] == null) {
          throw StateError('Ce chiffrement HLS n’est pas pris en charge.');
        }
        final local = await resource(
          uri.resolve(attrs['URI']!),
          extension: 'key',
        );
        if (await File('${directory.path}/$local').length() != 16) {
          throw StateError('Clé HLS invalide.');
        }
        output.add(
          '#EXT-X-KEY:METHOD=AES-128,URI="$local"${attrs['IV'] == null ? '' : ',IV=${attrs['IV']}'}',
        );
        continue;
      }
      if (line.startsWith('#EXT-X-MAP:')) {
        fragmented = true;
        final attrs = hlsAttributes(line);
        if (attrs['URI'] == null) {
          throw StateError('Initialisation HLS invalide.');
        }
        final range = attrs['BYTERANGE'] == null
            ? null
            : parseRange(attrs['BYTERANGE']!, 0);
        final local = await resource(
          uri.resolve(attrs['URI']!),
          range: range,
          extension: 'mp4',
        );
        output.add('#EXT-X-MAP:URI="$local"');
        continue;
      }
      if (!line.startsWith('#')) {
        final segmentUri = uri.resolve(line);
        if (byteRange != null &&
            !byteRange.contains('@') &&
            previousUri != segmentUri) {
          throw StateError('Plage HLS sans point de départ.');
        }
        final range = byteRange == null
            ? null
            : parseRange(byteRange, previousEnd);
        final local = await resource(
          segmentUri,
          range: range,
          extension: fragmented ? 'm4s' : 'ts',
        );
        if (range != null) previousEnd = range.start + range.length;
        previousUri = segmentUri;
        byteRange = null;
        output.add(local);
        onSegment();
        continue;
      }
      // No remote URI may survive in a local playlist.
      if (line.contains('URI=')) {
        throw StateError(
          'Cette variante HLS contient une ressource externe non prise en charge.',
        );
      }
      output.add(line);
    }
    if (byteRange != null) throw StateError('Liste HLS incomplète.');
    await File('${directory.path}/$filename')
        .writeAsString('${output.join('\n')}\n');
    return filename;
  }

  static ByteRange parseRange(String value, int previousEnd) {
    final parts = value.split('@'),
        length = int.tryParse(value.split('@').first);
    final start = parts.length == 1 ? previousEnd : int.tryParse(parts.last);
    if (length == null || length <= 0 || start == null || start < 0) {
      throw StateError('Plage HLS invalide.');
    }
    return ByteRange(start, length);
  }

  Future<String> resource(
    Uri uri, {
    ByteRange? range,
    required String extension,
  }) async {
    final key = '$uri:${range?.header ?? ''}';
    if (resources.containsKey(key)) return resources[key]!;
    final filename = 'asset-${serial++}.$extension';
    await transport.file(
      uri,
      File('${directory.path}/$filename'),
      range: range,
    );
    resources[key] = filename;
    return filename;
  }
}
