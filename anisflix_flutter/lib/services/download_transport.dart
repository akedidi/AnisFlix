import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ByteRange {
  final int start, length;
  const ByteRange(this.start, this.length);
  String get header => 'bytes=$start-${start + length - 1}';
}

class DownloadTransport {
  final http.Client client;
  final Map<String, String> headers;
  final bool Function() cancelled;
  final void Function(int bytes) onBytes;
  final void Function(int? total)? onLength;
  http.StreamedResponse? _prefetched;
  Uri? _prefetchedUri;
  DownloadTransport({
    required this.client,
    required this.headers,
    required this.cancelled,
    required this.onBytes,
    this.onLength,
  });
  void checkCancelled() {
    if (cancelled()) throw StateError('Téléchargement annulé.');
  }

  Future<http.StreamedResponse> request(Uri uri, {ByteRange? range}) async {
    checkCancelled();
    if (range == null && _prefetchedUri == uri && _prefetched != null) {
      final response = _prefetched!;
      _prefetched = null;
      _prefetchedUri = null;
      return response;
    }
    if (!['http', 'https'].contains(uri.scheme)) {
      throw StateError('Adresse de média invalide.');
    }
    final response = await client
        .send(
          http.Request('GET', uri)
            ..headers.addAll({
              ...headers,
              if (range != null) 'Range': range.header,
            }),
        )
        .timeout(const Duration(seconds: 30));
    if ((range != null && response.statusCode != 206) ||
        (range == null && response.statusCode != 200)) {
      await response.stream.listen((_) {}).cancel();
      throw HttpException(
        'Le serveur a refusé le téléchargement (${response.statusCode}).',
      );
    }
    return response;
  }

  Future<String> mediaType(Uri uri) async {
    final response = await request(uri);
    _prefetched = response;
    _prefetchedUri = uri;
    return response.headers['content-type']?.toLowerCase() ?? '';
  }

  Future<String> text(Uri uri) async {
    final response = await request(uri);
    final bytes = <int>[];
    await for (final chunk in response.stream.timeout(
      const Duration(seconds: 40),
    )) {
      checkCancelled();
      bytes.addAll(chunk);
      if (bytes.length > 2 * 1024 * 1024) {
        throw StateError('La liste de lecture est trop volumineuse.');
      }
    }
    return utf8.decode(bytes).replaceFirst('\uFEFF', '');
  }

  Future<int> file(Uri uri, File file, {ByteRange? range}) async {
    final response = await request(uri, range: range);
    final mime = response.headers['content-type']?.toLowerCase() ?? '';
    if (mime.contains('text/html')) {
      throw StateError('Le serveur a renvoyé une page Web au lieu du média.');
    }
    await file.parent.create(recursive: true);
    onLength?.call(response.contentLength);
    final sink = file.openWrite();
    var received = 0;
    try {
      await for (final chunk in response.stream.timeout(
        const Duration(seconds: 40),
      )) {
        checkCancelled();
        sink.add(chunk);
        received += chunk.length;
        onBytes(chunk.length);
      }
      await sink.flush();
      checkCancelled();
      if (received == 0 ||
          (response.contentLength != null &&
              received != response.contentLength) ||
          (range != null && received != range.length)) {
        throw const HttpException('Téléchargement incomplet.');
      }
      return received;
    } finally {
      await sink.close();
    }
  }
}
