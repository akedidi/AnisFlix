import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import '../models/media.dart';

class VidzySessionFailure implements Exception {
  const VidzySessionFailure();
}

/// Device-side paths observed in the TV APK. No remote JavaScript is executed.
class DirectExtractors {
  final http.Client client;
  DirectExtractors(this.client);
  static const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  Future<String> text(
    Uri uri,
    Map<String, String> headers, {
    Duration timeout = const Duration(seconds: 20),
  }) async {
    final response = await client.get(uri, headers: headers).timeout(timeout);
    if (response.statusCode != 200) {
      throw const FormatException('Host unavailable');
    }
    return response.body;
  }

  Future<List<StreamSource>> vixsrc(
    MediaItem item,
    int? season,
    int? episode,
  ) async {
    final path = item.type == 'movie'
        ? 'movie/${item.id}'
        : 'tv/${item.id}/$season/$episode';
    final page = Uri.parse('https://vixsrc.to/$path');
    final headers = {
      'User-Agent': userAgent,
      'Referer': page.toString(),
      'Origin': 'https://vixsrc.to',
    };
    final data = jsonDecode(
      await text(Uri.parse('https://vixsrc.to/api/$path'), headers),
    );
    if (data is! Map || data['src'] is! String) return [];
    final embed = page.resolve(data['src']);
    if (embed.host != page.host || !embed.path.startsWith('/embed/')) return [];
    final html = await text(embed, headers);
    final master = vixsrcMaster(html);
    if (master == null) return [];
    final variants = <StreamSource>[];
    try {
      final playlist = await text(master, headers);
      variants.addAll(vixsrcVariants(playlist, master, headers));
    } catch (_) {
      // The adaptive master remains usable if variant discovery is unavailable.
    }
    return [
      StreamSource(
        master.toString(),
        'VixSrc · Auto',
        provider: 'vixsrc',
        quality: 'Auto',
        language: 'VO',
        format: 'hls',
        headers: headers,
      ),
      ...variants,
    ];
  }

  static List<StreamSource> vixsrcVariants(
    String playlist,
    Uri master,
    Map<String, String> headers,
  ) {
    final lines = const LineSplitter().convert(playlist);
    final result = <StreamSource>[];
    final seen = <String>{};
    String? quality;
    for (final raw in lines) {
      final line = raw.trim();
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        final height = RegExp(r'RESOLUTION=\d+x(\d+)')
            .firstMatch(line)
            ?.group(1);
        quality = height == null ? null : '${height}p';
      } else if (line.isNotEmpty && !line.startsWith('#') && quality != null) {
        final uri = master.resolve(line);
        if (['https', 'http'].contains(uri.scheme) &&
            seen.add(uri.toString())) {
          result.add(
            StreamSource(
              uri.toString(),
              'VixSrc · $quality',
              provider: 'vixsrc',
              quality: quality,
              language: 'VO',
              format: 'hls',
              headers: headers,
            ),
          );
        }
        quality = null;
      }
    }
    return result;
  }

  static Uri? vixsrcMaster(String html) {
    String? capture(String pattern, String text) =>
        RegExp(pattern, dotAll: true).firstMatch(text)?.group(1);
    final block =
        capture(
          r'''window\.masterPlaylist\s*=\s*(\{.*?url\s*:\s*['"][^'"]+['"].*?\})''',
          html,
        ) ??
        html;
    final token = capture(r'''['"]token['"]\s*:\s*['"]([^'"]+)['"]''', block);
    final expires = capture(
      r'''['"]expires['"]\s*:\s*['"]([^'"]+)['"]''',
      block,
    );
    final url = capture(r'''url\s*:\s*['"](https?://[^'"]+)['"]''', block);
    if (token != null && expires != null && url != null) {
      final parsed = Uri.tryParse(url);
      final expiry = int.tryParse(expires);
      if (parsed?.host != 'vixsrc.to' ||
          !parsed!.path.startsWith('/playlist/') ||
          expiry == null ||
          expiry <= DateTime.now().millisecondsSinceEpoch ~/ 1000 + 60) {
        return null;
      }
      return parsed.replace(
        queryParameters: {
          ...parsed.queryParameters,
          'token': token,
          'expires': expires,
          'h': '1',
          'lang': 'en',
        },
      );
    }
    final direct = capture(r'''(https?://[^'"\s]+\.m3u8[^'"\s]*)''', html);
    return direct == null ? null : Uri.tryParse(direct);
  }

  Future<StreamSource?> embed(
    StreamSource source, {
    Duration timeout = const Duration(seconds: 20),
  }) async {
    var uri = Uri.parse(source.url);
    if (['uqload.bz', 'www.uqload.bz'].contains(uri.host)) {
      uri = uri.replace(host: 'uqload.vc', scheme: 'https');
    } else if (uri.host == 'vidmoly.me') {
      final id = RegExp(r'^/w/([a-zA-Z0-9]+)$').firstMatch(uri.path)?.group(1);
      if (id != null) uri = Uri.https('vidmoly.org', '/embed-$id.html');
    }
    final headers = {
      'User-Agent': userAgent,
      'Referer': '${uri.origin}/',
      'Origin': uri.origin,
    };
    var html = await text(uri, headers, timeout: timeout);
    if (uri.host.contains('vidmoly') && html.contains('startLoading')) {
      final token = RegExp(r'''url\s*\+=\s*['"]\?g=([^'"]+)['"]''')
          .firstMatch(html)
          ?.group(1);
      if (token != null) {
        html = await text(
          uri.replace(queryParameters: {...uri.queryParameters, 'g': token}),
          headers,
          timeout: timeout,
        );
      }
    }
    var url =
        quotedMedia(html) ?? unpackedMedia(html) ?? decodeVidzy(html, uri.host);
    if (url == null) return null;
    if (uri.host.contains('vidzy') && html.contains('/gate.php')) {
      // The signature alone only permits the preview. Establish the provider's
      // browser session on this device before giving the URL to the player.
      Map<String, dynamic>? session;
      try {
        session = await const MethodChannel('com.anisflix.reconstructed/vidzy')
            .invokeMapMethod<String, dynamic>('resolve', {
              'embed': uri.toString(),
              'media': url,
              'gateHosts': vidzyGateHosts(html).toList(),
            });
      } catch (_) {
        throw const VidzySessionFailure();
      }
      final authorized = session?['url'] as String?;
      if (authorized == null ||
          !playable(authorized) ||
          (Uri.parse(authorized).queryParameters['gk'] ?? '').isEmpty) {
        throw const VidzySessionFailure();
      }
      url = authorized;
      headers.addAll(
        Map<String, String>.from(session?['headers'] as Map? ?? {}),
      );
    }
    return StreamSource(
      url,
      source.label,
      provider: source.provider,
      quality: source.quality,
      language: source.language,
      format: Uri.parse(url).path.endsWith('.m3u8') ? 'hls' : 'mp4',
      headers: headers,
      subtitles: source.subtitles,
    );
  }

  static Set<String> vidzyGateHosts(String html) => {
    for (final match in RegExp(
      r'''https://([a-zA-Z0-9.-]+)/gate\.php(?:[?'"\s]|$)''',
    ).allMatches(html))
      if (match.group(1)!.toLowerCase() case final host
          when [
            'vidzy.cc',
            'vidzy.org',
            'vidzy.live',
            'vidzy.net',
          ].any((domain) => host == domain || host.endsWith('.$domain')))
        host,
  };

  static bool playable(String value) {
    final uri = Uri.tryParse(value);
    return uri != null &&
        ['https', 'http'].contains(uri.scheme) &&
        uri.host.isNotEmpty &&
        !value.contains('/troll/') &&
        !value.toLowerCase().contains('fake') &&
        RegExp(
          r'\.(m3u8|mp4|mkv)(?:$|[?#])',
          caseSensitive: false,
        ).hasMatch(value);
  }

  static String? quotedMedia(String html) {
    for (final match in RegExp(
      r'''(?:file|src)\s*[:=]\s*['"](https?://[^'"]+)['"]''',
    ).allMatches(html)) {
      final value = match
          .group(1)!
          .replaceAll(r'\/', '/')
          .replaceAll('&amp;', '&');
      final uri = Uri.tryParse(value);
      if (playable(value) &&
          uri?.path != '/static/hero.mp4' &&
          !value.toLowerCase().contains('big_buck_bunny')) {
        return value;
      }
    }
    return null;
  }

  // Decode the player's token dictionary without executing JavaScript.
  static String? unpackedMedia(String html) {
    if (!html.contains('eval(function(p,a,c,k,e,d)')) return null;
    final packed = RegExp(
      r"""\}\s*\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\.split\('\|'\)""",
    );
    for (final match in packed.allMatches(html)) {
      final radix = int.tryParse(match.group(2)!) ?? 0;
      if (radix < 2 || radix > 62) continue;
      final words = match.group(4)!.split('|');
      const digits =
          '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      final unpacked = match
          .group(1)!
          .replaceAllMapped(RegExp(r'\b\w+\b'), (m) {
            final token = m.group(0)!;
            var index = 0;
            for (final char in token.split('')) {
              final digit = digits.indexOf(char);
              if (digit < 0 || digit >= radix) return token;
              index = index * radix + digit;
              if (index >= words.length) return token;
            }
            return words[index].isEmpty ? token : words[index];
          })
          .replaceAll(r"\'", "'")
          .replaceAll(r'\"', '"');
      final url = quotedMedia(unpacked);
      if (url != null) return url;
    }
    return null;
  }

  static String? decodeVidzy(String html, String hostname) {
    final pattern = RegExp(
      r'''\(\s*(function\s*\(\s*s\s*\)\s*\{[\s\S]{20,4000}?\})\s*\)\s*\(\s*["']([^"']+)["']\s*\)''',
    );
    final hash = hostname.codeUnits.fold(0, (a, b) => (a + b) & 255);
    for (final match in pattern.allMatches(html)) {
      final code = match.group(1)!;
      if (!code.contains('atob') || !code.contains('charCodeAt')) continue;
      List<int> bytes;
      try {
        bytes = base64Decode(base64.normalize(match.group(2)!)).reversed
            .toList();
      } catch (_) {
        continue;
      }
      final calibrations = <int>{0};
      for (final m in RegExp(
        r'calc\(\s*1in\s*\+\s*(\d+)px\s*\)',
      ).allMatches(code)) {
        calibrations.add((96 + int.parse(m.group(1)!)) & 255);
      }
      if (code.contains('+BC')) {
        calibrations.addAll(List.generate(256, (i) => i));
      }
      for (final calibration in calibrations) {
        final value = String.fromCharCodes(
          List.generate(
            bytes.length,
            (i) => bytes[i] ^ ((0x3d + i * 89 + hash + calibration) & 255),
          ),
        );
        if (playable(value)) return value;
      }
    }
    return null;
  }
}
