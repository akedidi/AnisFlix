import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../models/media.dart';

abstract interface class TokenStorage {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

class SecureTokenStorage implements TokenStorage {
  final FlutterSecureStorage storage;
  SecureTokenStorage([FlutterSecureStorage? storage])
    : storage =
          storage ??
          const FlutterSecureStorage(
            mOptions: MacOsOptions(usesDataProtectionKeychain: false),
          );
  static const key = 'anisflix_trakt_auth_v1';
  @override
  Future<String?> read() => storage.read(key: key);
  @override
  Future<void> write(String value) => storage.write(key: key, value: value);
  @override
  Future<void> clear() => storage.delete(key: key);
}

class TraktChallenge {
  final String deviceCode, userCode;
  final Uri verification;
  final DateTime expires;
  int interval;
  TraktChallenge(
    this.deviceCode,
    this.userCode,
    this.verification,
    this.expires,
    this.interval,
  );
}

class TraktService extends ChangeNotifier {
  final String Function() backend;
  final http.Client client;
  final TokenStorage storage;
  final DateTime Function() clock;
  Map<String, dynamic>? _tokens;
  TraktChallenge? challenge;
  String? error;
  bool busy = false, _polling = false;
  DateTime? _nextPoll;
  int _generation = 0;
  Future<bool>? _refreshing;
  TraktService({
    required this.backend,
    http.Client? client,
    TokenStorage? storage,
    DateTime Function()? clock,
  }) : client = client ?? http.Client(),
       storage = storage ?? SecureTokenStorage(),
       clock = clock ?? DateTime.now;
  bool get connected => _tokens?['access_token'] is String;
  Future<void> restore() async {
    try {
      final raw = await storage.read();
      if (raw != null) {
        final value = jsonDecode(raw);
        if (value is Map<String, dynamic> && value['access_token'] is String) {
          _tokens = value;
        }
      }
    } catch (_) {
      error = 'Le stockage sécurisé du compte est indisponible.';
    }
    notifyListeners();
  }

  Future<http.Response> post(String type, Map<String, dynamic> body) => client
      .post(
        Uri.parse('${backend()}/api/proxy')
            .replace(queryParameters: {'type': type}),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      )
      .timeout(const Duration(seconds: 25));
  Future<void> begin() async {
    if (busy) return;
    final generation = ++_generation;
    busy = true;
    error = null;
    notifyListeners();
    try {
      final response = await post('trakt-device-code', {});
      if (response.statusCode != 200) {
        throw StateError(
          'Connexion à Trakt indisponible (${response.statusCode}).',
        );
      }
      final j = jsonDecode(response.body) as Map<String, dynamic>;
      final uri = Uri.parse(j['verification_url'] as String);
      if (uri.scheme != 'https' ||
          !(uri.host == 'trakt.tv' || uri.host.endsWith('.trakt.tv'))) {
        throw StateError('Adresse de connexion Trakt invalide.');
      }
      if (generation != _generation) return;
      challenge = TraktChallenge(
        j['device_code'] as String,
        j['user_code'] as String,
        uri,
        clock().add(Duration(seconds: (j['expires_in'] as num).toInt())),
        (j['interval'] as num? ?? 5).toInt().clamp(5, 60),
      );
      _nextPoll = clock().add(Duration(seconds: challenge!.interval));
    } catch (e) {
      if (generation == _generation) {
        error = e is StateError
            ? e.message
            : 'Impossible de démarrer la connexion à Trakt.';
      }
    } finally {
      if (generation == _generation) {
        busy = false;
        notifyListeners();
      }
    }
  }

  void cancel() {
    _generation++;
    challenge = null;
    busy = false;
    error = null;
    notifyListeners();
  }

  Future<void> poll() async {
    final c = challenge;
    if (c == null || _polling) return;
    if (!clock().isBefore(c.expires)) {
      challenge = null;
      error = 'Le code Trakt a expiré. Recommence la connexion.';
      notifyListeners();
      return;
    }
    if (_nextPoll != null && clock().isBefore(_nextPoll!)) return;
    _polling = true;
    final generation = _generation;
    _nextPoll = clock().add(Duration(seconds: c.interval));
    try {
      final response = await post('trakt-device-token', {
        'device_code': c.deviceCode,
      });
      if (generation != _generation) return;
      if (response.statusCode == 200) {
        await accept(
          jsonDecode(response.body) as Map<String, dynamic>,
          generation,
        );
        if (generation == _generation) {
          challenge = null;
          error = null;
        }
      } else if (response.statusCode == 429) {
        c.interval = (c.interval + 5).clamp(5, 120);
        _nextPoll = clock().add(Duration(seconds: c.interval));
      } else if (response.statusCode == 400) {
        // Authorization is still pending. Keep the code visible.
      } else {
        challenge = null;
        error = [404, 410].contains(response.statusCode)
            ? 'Le code Trakt a expiré.'
            : [409, 418].contains(response.statusCode)
            ? 'La connexion à Trakt a été refusée.'
            : 'Connexion à Trakt interrompue (${response.statusCode}).';
      }
    } catch (_) {
      if (generation == _generation) {
        error = 'Connexion réseau interrompue. Nouvelle tentative en cours.';
      }
    } finally {
      _polling = false;
      notifyListeners();
    }
  }

  Future<void> accept(Map<String, dynamic> tokens, int generation) async {
    if (tokens['access_token'] is! String ||
        tokens['refresh_token'] is! String) {
      throw StateError('Réponse Trakt invalide.');
    }
    final result = {
      ...tokens,
      'expires_at': clock()
          .add(
            Duration(seconds: (tokens['expires_in'] as num? ?? 604800).toInt()),
          )
          .toIso8601String(),
    };
    await storage.write(jsonEncode(result));
    if (generation == _generation) {
      _tokens = result;
    } else {
      await storage.clear();
    }
  }

  Future<void> disconnect() async {
    cancel();
    _tokens = null;
    await storage.clear();
    notifyListeners();
  }

  Future<bool> refresh() async {
    if (_refreshing != null) return _refreshing!;
    final task = _refresh();
    _refreshing = task;
    try {
      return await task;
    } finally {
      _refreshing = null;
    }
  }

  Future<bool> _refresh() async {
    final refreshToken = _tokens?['refresh_token'];
    if (refreshToken is! String) return false;
    final generation = _generation;
    try {
      final response = await post('trakt-refresh-token', {
        'refresh_token': refreshToken,
      });
      if (response.statusCode != 200) return false;
      await accept(
        jsonDecode(response.body) as Map<String, dynamic>,
        generation,
      );
      return connected;
    } catch (_) {
      return false;
    }
  }

  Future<bool> scrobble(
    MediaItem item,
    double fraction,
    String action, {
    int? season,
    int? episode,
  }) async {
    if (!connected ||
        !['movie', 'tv'].contains(item.type) ||
        !fraction.isFinite ||
        !['start', 'pause', 'stop'].contains(action)) {
      return false;
    }
    final progress = (fraction * 100).clamp(0.0, 100.0);
    if (action == 'stop' && progress == 0) return false;
    final expiry = DateTime.tryParse(_tokens?['expires_at'] ?? '');
    if (expiry != null &&
        clock().isAfter(expiry.subtract(const Duration(minutes: 1))) &&
        !await refresh()) {
      return false;
    }
    final payload = <String, dynamic>{
      'progress': progress,
      'action': action,
      if (item.type == 'movie')
        'movie': {
          'ids': {'tmdb': item.id},
        },
      if (item.type == 'tv')
        'show': {
          'ids': {'tmdb': item.id},
        },
      if (item.type == 'tv') 'episode': {'season': season, 'number': episode},
    };
    if (item.type == 'tv' && (season == null || episode == null)) return false;
    try {
      var response = await post('trakt-scrobble', {
        'access_token': _tokens!['access_token'],
        ...payload,
      });
      if (response.statusCode == 401 && await refresh()) {
        response = await post('trakt-scrobble', {
          'access_token': _tokens!['access_token'],
          ...payload,
        });
      }
      final ok = [200, 201, 409].contains(response.statusCode);
      if (!ok) {
        error = 'La synchronisation Trakt est momentanément indisponible.';
        notifyListeners();
      }
      return ok;
    } catch (_) {
      error = 'La synchronisation Trakt est momentanément indisponible.';
      notifyListeners();
      return false;
    }
  }

  @override
  void dispose() {
    client.close();
    super.dispose();
  }
}
