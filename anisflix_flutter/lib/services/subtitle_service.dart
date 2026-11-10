import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/media.dart';
import 'library.dart';
import 'native_sources.dart';
import 'subtitle_languages.dart';

/// Same lookup as iOS: TMDB → IMDb → OpenSubtitles Stremio catalogue.
/// macOS calls the existing iOS service; Android uses the same HTTP endpoints.
class SubtitleService {
  final Library library;
  final http.Client client;
  final NativeSources? native;
  final Map<String, Future<List<SourceSubtitle>>> _requests = {};

  SubtitleService(this.library, {http.Client? client})
    : client = client ?? http.Client(),
      native = client == null && NativeSources.supported
          ? NativeSources(library)
          : null;

  void close() {
    _requests.clear();
    client.close();
  }

  Future<List<SourceSubtitle>> load(
    MediaItem item, {
    int? season,
    int? episode,
  }) {
    if (item.id <= 0 || !['movie', 'tv'].contains(item.type)) {
      return Future.value(const []);
    }
    if (item.type == 'tv' &&
        (season == null || season < 0 || episode == null || episode < 1)) {
      return Future.value(const []);
    }
    final key = item.type == 'tv' ? '${item.key}:$season:$episode' : item.key;
    if (_requests[key] case final existing?) return existing;
    final pending = _load(item, season, episode);
    _requests[key] = pending;
    // Reopening the menu reuses a successful list. Empty/error responses can
    // be retried; a failure must not block video playback or become permanent.
    unawaited(
      pending.then<void>(
        (tracks) {
          if (tracks.isEmpty && _requests[key] == pending) {
            _requests.remove(key);
          }
        },
        onError: (Object _, StackTrace _) {
          if (_requests[key] == pending) _requests.remove(key);
        },
      ),
    );
    return pending;
  }

  Future<Map<String, dynamic>> _json(Uri uri) async {
    final response = await client.get(uri).timeout(const Duration(seconds: 20));
    if (response.statusCode != 200) {
      throw StateError(
        'Subtitle service unavailable (${response.statusCode}).',
      );
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<List<SourceSubtitle>> _load(
    MediaItem item,
    int? season,
    int? episode,
  ) async {
    final List<SourceSubtitle> tracks;
    if (native != null) {
      tracks = await native!.subtitles(item, season, episode);
    } else {
      if (library.apiKey.isEmpty) return const [];
      final info = await _json(
        Uri.https(
          'api.themoviedb.org',
          '/3/${item.type}/${item.id}${item.type == 'tv' ? '/external_ids' : ''}',
          {'api_key': library.apiKey},
        ),
      );
      final imdbId = info['imdb_id'];
      if (imdbId is! String || !RegExp(r'^tt\d+$').hasMatch(imdbId)) {
        return const [];
      }
      final path = item.type == 'tv'
          ? 'series/$imdbId:$season:$episode'
          : 'movie/$imdbId';
      final payload = await _json(
        Uri.https('opensubtitles-v3.strem.io', '/subtitles/$path.json'),
      );
      tracks = [
        for (final row
            in (payload['subtitles'] as List? ?? []).whereType<Map>())
          if (row['lang'] case final String code)
            if (Uri.tryParse('${row['url'] ?? ''}') case final Uri uri
                when ['http', 'https'].contains(uri.scheme) &&
                    uri.host.isNotEmpty)
              SourceSubtitle(
                uri.toString(),
                SubtitleLanguages.names[code] ?? code,
                code,
              ),
      ];
    }
    // Keep every release/version in a language, deduplicating exact URLs only.
    final seen = <String>{};
    final result = tracks
        .where((track) => seen.add(track.url))
        .indexed
        .toList();
    result.sort((a, b) {
      final rank = SubtitleLanguages.priority(a.$2.language)
          .compareTo(SubtitleLanguages.priority(b.$2.language));
      if (rank != 0) return rank;
      final label = a.$2.label.compareTo(b.$2.label);
      return label != 0 ? label : a.$1.compareTo(b.$1);
    });
    return result.map((entry) => entry.$2).toList();
  }
}
