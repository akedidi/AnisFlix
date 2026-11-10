import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/media.dart';
import 'direct_extractors.dart';

/// Resolves French anime catalogues and their players on the playback device.
class FrenchAnimeSources {
  FrenchAnimeSources(this._client) : _extractors = DirectExtractors(_client);

  final http.Client _client;
  final DirectExtractors _extractors;
  static final _sama = Uri.https('anime-sama.to', '/');
  static final _french = Uri.https('french-anime.com', '/');
  static const _timeout = Duration(seconds: 8);

  Future<List<StreamSource>> load(
    String provider,
    MediaItem item,
    Map<String, dynamic> metadata,
    int? season,
    int? episode,
  ) async {
    final titles = {
      item.title,
      metadata['title'],
      metadata['name'],
      metadata['original_title'],
      metadata['original_name'],
      for (final row in _rows(metadata['translations'], 'translations'))
        if (row['iso_639_1'] == 'fr' && row['data'] is Map)
          (row['data'] as Map)[item.type == 'movie' ? 'title' : 'name'],
      for (final row in _rows(
        metadata['alternative_titles'],
        item.type == 'movie' ? 'titles' : 'results',
      ))
        if (['romaji', 'romanized'].contains('${row['type']}'.toLowerCase()))
          row['title'],
    }.whereType<String>().where((title) => _slug(title).isNotEmpty).toList();
    final movie = item.type == 'movie';
    if (!movie && ((season ?? 0) < 1 || (episode ?? 0) < 1)) return [];
    if (provider == 'animesama') {
      return _animeSama(titles, movie, season ?? 1, episode ?? 1);
    }
    return _frenchAnime(titles, movie, season ?? 1, episode ?? 1);
  }

  static Iterable<Map> _rows(dynamic value, String key) =>
      value is Map && value[key] is List
      ? (value[key] as List).whereType<Map>()
      : const [];

  Future<String> _text(
    Uri uri,
    Uri referer, {
    Map<String, String>? form,
  }) async {
    try {
      final headers = {
        'User-Agent': DirectExtractors.userAgent,
        'Referer': referer.toString(),
      };
      final response =
          await (form == null
                  ? _client.get(uri, headers: headers)
                  : _client.post(uri, headers: headers, body: form))
              .timeout(_timeout);
      return response.statusCode == 200
          ? utf8.decode(response.bodyBytes, allowMalformed: true)
          : '';
    } catch (_) {
      return '';
    }
  }

  Future<List<StreamSource>> _animeSama(
    List<String> titles,
    bool movie,
    int season,
    int episode,
  ) async {
    final names = titles.map(_slug).toSet();
    final searched = <String>{};
    Future<List<StreamSource>> find(Iterable<String> slugs) async {
      for (final slug in slugs.where(searched.add)) {
        final catalogue = _sama.resolve('catalogue/$slug/');
        final html = await _text(catalogue, _sama);
        final heading = RegExp(
          r'<h1\b[^>]*>([\s\S]*?)</h1>',
          caseSensitive: false,
        ).firstMatch(html)?.group(1);
        if (heading == null) continue;
        final name = _slug(_decode(heading.replaceAll(RegExp(r'<[^>]*>'), '')));
        if (name.isEmpty ||
            !names.any(
              (title) => title == name || (movie && title.startsWith('$name-')),
            )) {
          continue;
        }
        final streams = await Future.wait([
          for (final language in ['vostfr', 'vf'])
            () async {
              final players = await _samaEpisode(
                catalogue,
                language,
                movie,
                season,
                episode,
              );
              return _playable(
                players,
                'animesama',
                language.toUpperCase(),
                catalogue,
              );
            }(),
        ]);
        final found = streams.expand((sources) => sources.take(2)).toList();
        if (found.isNotEmpty) return found;
      }
      return [];
    }

    final guessed = await find(names.take(5));
    if (guessed.isNotEmpty) return guessed;

    final results = await Future.wait([
      for (final title in titles.take(4))
        _text(
          _sama.resolve('template-php/defaut/fetch.php'),
          _sama,
          form: {'query': title},
        ),
    ]);
    return find(
      {
        for (final html in results)
          for (final match in RegExp(r'/catalogue/([\w-]+)').allMatches(html))
            match.group(1)!,
      }.take(8),
    );
  }

  Future<List<String>> _samaEpisode(
    Uri catalogue,
    String language,
    bool movie,
    int season,
    int episode,
  ) async {
    Future<List<List<String>>> arrays(String path) async {
      final page = catalogue.resolve(
        '${path.isEmpty ? '' : '$path/'}$language/',
      );
      final script = page.resolve('episodes.js');
      var rows = _scriptArrays(await _text(script, page));
      if (rows.isEmpty) {
        final html = await _text(page, catalogue);
        final version = RegExp(
          r'''<script\b[^>]*\bsrc=['"](?:\./)?episodes\.js\?filever=(\d+)['"]''',
          caseSensitive: false,
        ).firstMatch(html)?.group(1);
        if (version != null) {
          rows = _scriptArrays(
            await _text(
              script.replace(queryParameters: {'filever': version}),
              page,
            ),
          );
        }
      }
      return rows;
    }

    List<String> players(List<List<String>> rows, int index) => [
      for (final row in rows)
        if (index < row.length && row[index].isNotEmpty) row[index],
    ];

    if (movie) {
      for (final path in ['film', 'film2']) {
        final urls = players(await arrays(path), 0);
        if (urls.isNotEmpty) return urls;
      }
      return [];
    }

    final main = await arrays('saison$season');
    if (main.isEmpty) {
      return season == 1 ? players(await arrays(''), episode - 1) : [];
    }
    var index = episode - 1;
    var rows = main;
    for (var part = 1; part <= 5; part++) {
      // A missing part leaves its length unknown.
      if (rows.isEmpty) return [];
      final length = rows
          .map((row) => row.length)
          .reduce((a, b) => a > b ? a : b);
      if (index < length) return players(rows, index);
      index -= length;
      if (part < 5) rows = await arrays('saison$season-${part + 1}');
    }
    return [];
  }

  static List<List<String>> _scriptArrays(String text) => [
    for (final match in RegExp(
      r'(?:var|let|const)\s+eps\d*\s*=\s*\[([\s\S]*?)\]\s*;',
    ).allMatches(text))
      [
        for (final value in RegExp(
          r"""'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)["]""",
        ).allMatches(match.group(1)!))
          _decode(value.group(1) ?? value.group(2)!),
      ],
  ].where((row) => row.isNotEmpty).toList();

  Future<List<StreamSource>> _frenchAnime(
    List<String> titles,
    bool movie,
    int season,
    int episode,
  ) async {
    final names = titles
        .map((title) => _slug(title.replaceAll(RegExp("['’]"), '')))
        .toSet();
    final visited = <Uri>{};
    Future<List<StreamSource>> find(String document) async {
      final pages = <String, Set<Uri>>{'VF': {}, 'VOSTFR': {}};
      for (final match in RegExp(
        r'''(?:href\s*=\s*["']|<loc>\s*)([^"'<>\s]+\.html)(?:["']|\s*</loc>)''',
        caseSensitive: false,
      ).allMatches(document)) {
        final uri = _french.resolve(_decode(match.group(1)!));
        if (uri.host != _french.host || visited.contains(uri)) continue;
        final article = RegExp(
          r'^/(animes-vf|animes-vostfr|films-vf-vostfr|exclue)/\d+-([^/]+)\.html$',
        ).firstMatch(uri.path);
        if (article == null) continue;
        final category = article.group(1)!;
        if ((category == 'films-vf-vostfr' && !movie) ||
            (movie && category.startsWith('animes-'))) {
          continue;
        }
        var slug = article.group(2)!.replaceFirst(RegExp(r'^x-'), '');
        final version = RegExp(r'-(vostfr|truefrench|french|vf)$')
            .firstMatch(slug);
        final language =
            category == 'animes-vostfr' || version?.group(1) == 'vostfr'
            ? 'VOSTFR'
            : 'VF';
        if (category == 'exclue' && version == null) continue;
        slug = slug.replaceFirst(
          RegExp(r'-(vostfr|truefrench|french|vf)$'),
          '',
        );
        if (!movie &&
            RegExp(r'(?:^|-)(?:film|movie|oav|ova)(?:-|$)').hasMatch(slug)) {
          continue;
        }
        if (!movie && !names.contains(slug)) {
          final suffix = RegExp(r'-(?:(?:saison|season)-)?(\d+)$')
              .firstMatch(slug);
          if (suffix == null || int.parse(suffix.group(1)!) != season) continue;
          slug = slug.substring(0, suffix.start);
        } else if (!movie && season != 1) {
          continue;
        }
        if (names.contains(slug)) pages[language]!.add(uri);
      }

      final result = await Future.wait([
        for (final entry in pages.entries)
          () async {
            for (final page in entry.value.take(2)) {
              visited.add(page);
              final html = await _text(page, _french);
              final body =
                  RegExp(
                    r'''<div\b[^>]*class=["']eps["'][^>]*>([\s\S]*?)</div>''',
                    caseSensitive: false,
                  ).firstMatch(html)?.group(1) ??
                  '';
              final line = const LineSplitter()
                  .convert(body.replaceAll('__NEWL__', '\n'))
                  .map((row) => row.trim())
                  .where((row) => row.startsWith('$episode!'))
                  .firstOrNull;
              if (line == null) continue;
              final sources = await _playable(
                line.substring(line.indexOf('!') + 1).split(','),
                'frenchanime',
                entry.key,
                page,
              );
              if (sources.isNotEmpty) return sources.first;
            }
            return null;
          }(),
      ]);
      return result.whereType<StreamSource>().toList();
    }

    final index = await find(
      await _text(_french.resolve('sitemap.xml'), _french),
    );
    if (index.isNotEmpty) return index;

    // Recent releases can precede the sitemap and move off the first page.
    // Bound the fallback so an unavailable title cannot crawl the full site.
    for (var page = 1; page <= 3; page++) {
      final listings = await Future.wait([
        for (final category
            in movie ? ['films-vf-vostfr/'] : ['animes-vf/', 'animes-vostfr/'])
          _text(
            _french.resolve('$category${page == 1 ? '' : 'page/$page/'}'),
            _french,
          ),
      ]);
      final listed = await find(listings.join('\n'));
      if (listed.isNotEmpty) return listed;
      if (listings.every((html) => html.isEmpty)) break;
    }

    for (final title in titles.take(3)) {
      final html = await _text(
        _french.resolve('index.php?do=search'),
        _french,
        form: {'do': 'search', 'subaction': 'search', 'story': title},
      );
      if (html.isEmpty || html.contains('Just a moment')) break;
      final found = await find(html);
      if (found.isNotEmpty) return found;
    }
    return [];
  }

  Future<List<StreamSource>> _playable(
    List<String> players,
    String provider,
    String language,
    Uri page,
  ) async {
    // Each reader can fail independently. Probe them together so a dead mirror
    // cannot delay a working one by the sum of their timeouts.
    final results = await Future.wait([
      for (final player
          in players.where((url) => url.trim().isNotEmpty).take(6))
        _resolve(player.trim(), provider, language, page),
    ]);
    return results.whereType<StreamSource>().toList();
  }

  Future<StreamSource?> _resolve(
    String value,
    String provider,
    String language,
    Uri page,
  ) async {
    try {
      final url = page.resolve(_decode(value));
      if (!['http', 'https'].contains(url.scheme) || url.host.isEmpty) {
        return null;
      }
      final source = StreamSource.parse({
        'url': url.toString(),
        'provider': provider,
        'language': language,
        'quality': 'HD',
        'type': !DirectExtractors.playable(url.toString())
            ? 'embed'
            : url.path.toLowerCase().endsWith('.m3u8')
            ? 'hls'
            : 'mp4',
        'headers': {
          'User-Agent': DirectExtractors.userAgent,
          'Referer': page.toString(),
        },
      }, provider)!;
      final direct = source.needsExtraction
          ? await _extractors.embed(source, timeout: _timeout)
          : source;
      if (direct == null) return null;
      final request = http.Request('GET', Uri.parse(direct.url))
        ..headers.addAll(direct.headers)
        ..headers['Range'] = 'bytes=0-8191';
      final response = await _client.send(request).timeout(_timeout);
      final first = await response.stream.first.timeout(_timeout);
      if (response.statusCode != 200 && response.statusCode != 206) return null;
      final contentType = response.headers['content-type'] ?? '';
      final prefix = utf8
          .decode(first.take(128).toList(), allowMalformed: true)
          .trimLeft();
      if (prefix.startsWith('#EXTM3U') ||
          (first.isNotEmpty && contentType.startsWith('video/'))) {
        return direct;
      }
    } catch (_) {
      // The next reader can still provide the exact episode.
    }
    return null;
  }

  static String _decode(String value) => value
      .replaceAll('&amp;', '&')
      .replaceAll('&#39;', "'")
      .replaceAll(r'\/', '/');

  static String _slug(String title) {
    var value = title.toLowerCase();
    const folds = {
      'a': 'àâäáãå',
      'c': 'ç',
      'e': 'éèêë',
      'i': 'íìîï',
      'n': 'ñ',
      'o': 'óòôöõ',
      'u': 'úùûü',
      'y': 'ÿý',
      'oe': 'œ',
      'ae': 'æ',
    };
    for (final entry in folds.entries) {
      value = value.replaceAll(RegExp('[${entry.value}]'), entry.key);
    }
    return value
        .replaceAll(RegExp('[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }
}
