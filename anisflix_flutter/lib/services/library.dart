import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/media.dart';
import 'trakt.dart';
import 'platform_bridge.dart';

class Library extends ChangeNotifier {
  final SharedPreferences prefs;
  late final trakt = TraktService(backend: () => backend);
  final Map<String, MediaItem> favorites = {};
  final Map<String, Map<String, dynamic>> progress = {};
  final List<Map<String, dynamic>> downloads = [];
  String language, apiKey, backend;
  ThemeMode get themeMode => ThemeMode.values.firstWhere(
    (mode) => mode.name == prefs.getString('themeMode'),
    orElse: () => ThemeMode.dark,
  );
  Future<void> setThemeMode(ThemeMode mode) async {
    await prefs.setString('themeMode', mode.name);
    notifyListeners();
  }

  static const defaultSubtitleFontSize = 32.0;
  double get subtitleFontSize =>
      (prefs.getDouble('subtitleFontSize') ?? defaultSubtitleFontSize).clamp(
        16.0,
        48.0,
      );

  Future<void> setSubtitleFontSize(double size) async {
    await prefs.setDouble('subtitleFontSize', size.clamp(16.0, 48.0));
    notifyListeners();
  }

  Future<void> clearProgress() async {
    await prefs.remove('progress');
    progress.clear();
    notifyListeners();
  }

  Library(this.prefs)
    : language = prefs.getString('language') ?? 'fr-FR',
      apiKey = const String.fromEnvironment('TMDB_API_KEY'),
      backend = prefs.getString('backend') ?? 'https://anisflix.vercel.app' {
    PlatformBridge.language = language;
  }
  static Future<Library> load() async =>
      Library(await SharedPreferences.getInstance())..restore();
  void restore() {
    try {
      for (final row
          in jsonDecode(prefs.getString('favorites') ?? '[]') as List) {
        final item = MediaItem.fromJson(Map<String, dynamic>.from(row));
        favorites[item.key] = item;
      }
      final raw = jsonDecode(prefs.getString('progress') ?? '{}') as Map;
      raw.forEach(
        (k, v) => progress[k.toString()] = Map<String, dynamic>.from(v),
      );
      for (final row
          in jsonDecode(prefs.getString('downloads') ?? '[]') as List) {
        downloads.add(Map<String, dynamic>.from(row));
      }
    } catch (_) {
      /* Preserve readable entries if old local data is malformed. */
    }
  }

  Future<void> toggleFavorite(MediaItem item) async {
    if (favorites.containsKey(item.key)) {
      favorites.remove(item.key);
    } else {
      favorites[item.key] = item;
    }
    await prefs.setString(
      'favorites',
      jsonEncode(favorites.values.map((x) => x.toJson()).toList()),
    );
    notifyListeners();
  }

  String progressKey(MediaItem item, int? season, int? episode) =>
      '${item.key}:${season ?? 0}:${episode ?? 0}';

  /// Series cards follow the last played episode; episode cards stay specific.
  double? progressFraction(MediaItem item, {int? season, int? episode}) {
    Map<String, dynamic>? saved;
    final episodeNumber = episode ?? item.latestEpisode;
    if (item.type != 'tv' || episodeNumber != null) {
      saved =
          progress[progressKey(
            item,
            item.type == 'tv' ? season ?? item.latestSeason ?? 1 : null,
            item.type == 'tv' ? episodeNumber : null,
          )];
    } else {
      for (final entry in progress.entries) {
        if (!entry.key.startsWith('${item.key}:')) continue;
        if (saved == null ||
            '${entry.value['updated'] ?? ''}'.compareTo(
                  '${saved['updated'] ?? ''}',
                ) >
                0) {
          saved = entry.value;
        }
      }
    }
    final position = saved?['position'], duration = saved?['duration'];
    if (position is! num ||
        duration is! num ||
        !position.isFinite ||
        !duration.isFinite ||
        position <= 0 ||
        duration <= 0) {
      return null;
    }
    return (position / duration).clamp(0.0, 1.0);
  }

  Future<void> saveProgress(
    MediaItem item,
    int? season,
    int? episode,
    Duration position,
    Duration duration,
  ) async {
    if (duration.inSeconds <= 0) return;
    progress[progressKey(item, season, episode)] = {
      'media': item.toJson(),
      'season': season,
      'episode': episode,
      'position': position.inSeconds,
      'duration': duration.inSeconds,
      'updated': DateTime.now().toIso8601String(),
    };
    await prefs.setString('progress', jsonEncode(progress));
    notifyListeners();
  }

  Future<void> saveSettings({
    required String language,
    required String backend,
    required String apiKey,
  }) async {
    this.language = language;
    PlatformBridge.language = language;
    this.backend = backend.replaceAll(RegExp(r'/+$'), '');
    this.apiKey = apiKey.trim();
    await prefs.setString('language', language);
    await prefs.setString('backend', this.backend);
    notifyListeners();
  }

  Future<void> saveDownloads() async {
    await prefs.setString('downloads', jsonEncode(downloads));
    notifyListeners();
  }
}
