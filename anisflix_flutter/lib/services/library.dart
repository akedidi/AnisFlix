import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/media.dart';
import 'trakt.dart';

class Library extends ChangeNotifier {
  final SharedPreferences prefs;
  late final trakt = TraktService(backend: () => backend);
  final Map<String, MediaItem> favorites = {};
  final Map<String, Map<String, dynamic>> progress = {};
  final List<Map<String, dynamic>> downloads = [];
  String language, apiKey, backend;
  Library(this.prefs)
    : language = prefs.getString('language') ?? 'fr-FR',
      apiKey = const String.fromEnvironment('TMDB_API_KEY'),
      backend = prefs.getString('backend') ?? 'https://anisflix.vercel.app';
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
