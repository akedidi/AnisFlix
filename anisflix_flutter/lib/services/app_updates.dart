import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const updateRepository = 'akedidi/AnisFlix';
const updateTrack = 'flutter-reconstruction';
const updateManifestName = 'anisflix-update.json';

class UpdateFailure implements Exception {
  final String message;
  const UpdateFailure(this.message);
  @override
  String toString() => message;
}

class AppVersion implements Comparable<AppVersion> {
  final int major, minor, patch, build;
  const AppVersion(this.major, this.minor, this.patch, this.build);
  factory AppVersion.parse(String version, int build) {
    final match = RegExp(r'^(\d+)\.(\d+)\.(\d+)$').firstMatch(version);
    if (match == null || build < 0) {
      throw const FormatException('Invalid stable version');
    }
    return AppVersion(
      int.parse(match[1]!),
      int.parse(match[2]!),
      int.parse(match[3]!),
      build,
    );
  }
  String get name => '$major.$minor.$patch';
  @override
  String toString() => '$name+$build';
  @override
  int compareTo(AppVersion other) {
    final a = [major, minor, patch, build];
    final b = [other.major, other.minor, other.patch, other.build];
    for (var i = 0; i < a.length; i++) {
      final result = a[i].compareTo(b[i]);
      if (result != 0) return result;
    }
    return 0;
  }
}

class UpdateTarget {
  final String platform, packageId;
  const UpdateTarget(this.platform, this.packageId);
  factory UpdateTarget.forPackage(String system, String packageId) {
    if (system == 'macos') return UpdateTarget('macos', packageId);
    if (system == 'android') {
      final tvPackage =
          packageId.endsWith('.tv') || packageId.endsWith('.tv.debug');
      return UpdateTarget(
        tvPackage ? 'android-tv' : 'android-mobile',
        packageId,
      );
    }
    throw const UpdateFailure('Mises à jour indisponibles sur ce système.');
  }
}

class AppUpdate {
  final AppVersion version;
  final Uri url, releasePage;
  final String filename, sha256Hex, notes;
  final int size;
  const AppUpdate({
    required this.version,
    required this.url,
    required this.releasePage,
    required this.filename,
    required this.sha256Hex,
    required this.size,
    required this.notes,
  });
}

class UpdateService {
  final http.Client client;
  UpdateService({http.Client? client}) : client = client ?? http.Client();
  void close() => client.close();

  static Uri releaseUri(String value, {String? tag}) {
    final uri = Uri.parse(value);
    final prefix = '/$updateRepository/releases/';
    if (uri.scheme != 'https' ||
        uri.host != 'github.com' ||
        uri.userInfo.isNotEmpty ||
        uri.hasPort ||
        !uri.path.startsWith('${prefix}download/') ||
        (tag != null && !uri.path.startsWith('${prefix}download/$tag/'))) {
      throw const UpdateFailure('Adresse de mise à jour invalide.');
    }
    return uri;
  }

  Future<dynamic> _json(Uri uri) async {
    final response = await client
        .get(
          uri,
          headers: {
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AnisFlix-Flutter-Updater',
          },
        )
        .timeout(const Duration(seconds: 25));
    if (response.statusCode != 200) {
      throw UpdateFailure(
        response.statusCode == 403 || response.statusCode == 429
            ? 'Limite GitHub atteinte. Réessaie plus tard.'
            : 'Vérification indisponible (HTTP ${response.statusCode}).',
      );
    }
    if (response.bodyBytes.length > 4 * 1024 * 1024) {
      throw const UpdateFailure('Réponse de mise à jour trop volumineuse.');
    }
    return jsonDecode(utf8.decode(response.bodyBytes));
  }

  Future<AppUpdate?> check(UpdateTarget target, AppVersion installed) async {
    AppUpdate? newest;
    // Do not use releases/latest: this repository has older builds in newer tags.
    for (var page = 1; page <= 10; page++) {
      final rows = await _json(
        Uri.https('api.github.com', '/repos/$updateRepository/releases', {
          'per_page': '100',
          'page': '$page',
        }),
      ) as List;
      for (final row in rows.cast<Map<String, dynamic>>()) {
        if (row['draft'] == true || row['prerelease'] == true) continue;
        final assets = (row['assets'] as List).cast<Map<String, dynamic>>();
        final manifests = assets.where((a) => a['name'] == updateManifestName);
        if (manifests.isEmpty) continue;
        final tag = row['tag_name'] as String;
        final manifestUrl = releaseUri(
          manifests.single['browser_download_url'] as String,
          tag: tag,
        );
        final manifest = await _json(manifestUrl) as Map<String, dynamic>;
        if (manifest['schema'] != 1 || manifest['track'] != updateTrack) {
          continue;
        }
        final platforms = manifest['platforms'] as Map<String, dynamic>;
        final entry = platforms[target.platform] as Map<String, dynamic>?;
        if (entry == null || entry['packageId'] != target.packageId) continue;
        final version = AppVersion.parse(
          manifest['version'] as String,
          manifest['build'] as int,
        );
        if (version.build <= installed.build ||
            version.compareTo(installed) <= 0 ||
            (newest != null && version.compareTo(newest.version) <= 0)) {
          continue;
        }
        final name = entry['asset'] as String;
        final extension = target.platform == 'macos' ? '.zip' : '.apk';
        if (!RegExp(r'^[A-Za-z0-9._-]+$').hasMatch(name) ||
            !name.endsWith(extension)) {
          throw const UpdateFailure('Paquet de mise à jour incompatible.');
        }
        final matching = assets.where((a) => a['name'] == name);
        if (matching.length != 1) {
          throw const UpdateFailure('Paquet de mise à jour absent.');
        }
        final asset = matching.single;
        final digest = entry['sha256'] as String;
        final size = entry['size'] as int;
        if (!RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(digest) ||
            size <= 0 ||
            size > 1024 * 1024 * 1024 ||
            asset['size'] != size) {
          throw const UpdateFailure('Informations de vérification invalides.');
        }
        newest = AppUpdate(
          version: version,
          url: releaseUri(asset['browser_download_url'] as String, tag: tag),
          releasePage: Uri.https(
            'github.com',
            '/$updateRepository/releases/tag/$tag',
          ),
          filename: name,
          sha256Hex: digest.toLowerCase(),
          size: size,
          notes: (row['body'] as String? ?? '').substring(
            0,
            (row['body'] as String? ?? '').length.clamp(0, 12000),
          ),
        );
      }
      if (rows.length < 100) return newest;
    }
    throw const UpdateFailure(
      'Trop de releases pour terminer la vérification.',
    );
  }

  Future<File> download(
    AppUpdate update,
    Directory directory,
    void Function(double) progress,
  ) async {
    await directory.create(recursive: true);
    final file = File('${directory.path}/${update.filename}');
    final partial = File('${file.path}.part');
    IOSink? output;
    try {
      final response = await client
          .send(http.Request('GET', releaseUri(update.url.toString())))
          .timeout(const Duration(seconds: 30));
      if (response.statusCode != 200 ||
          (response.contentLength != null &&
              response.contentLength != update.size)) {
        throw const UpdateFailure('Téléchargement incomplet ou indisponible.');
      }
      output = partial.openWrite();
      final digestOutput = _DigestOutput();
      final hash = sha256.startChunkedConversion(digestOutput);
      var received = 0;
      await for (final chunk in response.stream.timeout(
        const Duration(seconds: 45),
      )) {
        received += chunk.length;
        if (received > update.size) {
          throw const UpdateFailure('Taille du paquet incorrecte.');
        }
        hash.add(chunk);
        output.add(chunk);
        progress(received / update.size);
      }
      hash.close();
      await output.flush();
      await output.close();
      output = null;
      if (received != update.size ||
          digestOutput.value.toString() != update.sha256Hex) {
        throw const UpdateFailure(
          'Le fichier est corrompu : vérification SHA-256 échouée.',
        );
      }
      if (await file.exists()) await file.delete();
      return await partial.rename(file.path);
    } finally {
      await output?.close();
      if (await partial.exists()) await partial.delete();
    }
  }
}

class _DigestOutput implements Sink<Digest> {
  Digest? value;
  @override
  void add(Digest data) => value = data;
  @override
  void close() {}
}

class UpdateController extends ChangeNotifier {
  final SharedPreferences prefs;
  final UpdateService service;
  static const channel = MethodChannel('com.anisflix.reconstructed/updates');
  AppVersion? installed;
  UpdateTarget? target;
  AppUpdate? available;
  File? downloaded;
  bool checking = false, downloading = false, disposed = false;
  double progress = 0;
  String? message;
  bool get automatic => prefs.getBool('automaticUpdates') ?? true;
  UpdateController(this.prefs, {UpdateService? service})
    : service = service ?? UpdateService();
  void changed() {
    if (!disposed) notifyListeners();
  }

  Future<void> initialize() async {
    try {
      final info = await PackageInfo.fromPlatform();
      installed = AppVersion.parse(info.version, int.parse(info.buildNumber));
      // Select the installed APK flavor, even if a mobile APK runs on a TV.
      target = UpdateTarget.forPackage(
        Platform.operatingSystem,
        info.packageName,
      );
      changed();
      if (automatic && !disposed) await check();
    } catch (_) {
      message =
          'Vérification indisponible : version de l’application inconnue.';
      changed();
    }
  }

  Future<void> setAutomatic(bool value) async {
    await prefs.setBool('automaticUpdates', value);
    changed();
  }

  Future<void> check() async {
    if (checking || downloading || disposed) return;
    if (target == null || installed == null) {
      message = 'Version de l’application indisponible.';
      changed();
      return;
    }
    checking = true;
    message = null;
    changed();
    try {
      available = await service.check(target!, installed!);
      downloaded = null;
      message = available == null
          ? 'Aucune mise à jour compatible publiée pour cette édition.'
          : 'La version ${available!.version.name} est disponible.';
    } catch (error) {
      message = error is UpdateFailure
          ? error.message
          : 'Vérification impossible. Vérifie ta connexion et réessaie.';
    } finally {
      checking = false;
      changed();
    }
  }

  Future<void> download() async {
    if (available == null || downloading || disposed) return;
    downloading = true;
    message = null;
    progress = 0;
    changed();
    try {
      final temp = await getTemporaryDirectory();
      downloaded = await service.download(
        available!,
        Directory('${temp.path}/app-updates'),
        (value) {
          progress = value;
          changed();
        },
      );
      message = Platform.isMacOS
          ? 'Archive vérifiée. Ouvre-la puis remplace AnisFlix dans Applications après avoir quitté l’app.'
          : 'Paquet vérifié. Tu peux lancer l’installation.';
    } catch (error) {
      message = error is UpdateFailure
          ? error.message
          : 'Téléchargement impossible. Réessaie.';
    } finally {
      downloading = false;
      changed();
    }
  }

  Future<void> install() async {
    final file = downloaded;
    if (file == null) return;
    try {
      // Recheck on every handoff, including a retry after permission settings.
      final update = available!;
      if (await file.length() != update.size ||
          (await sha256.bind(file.openRead()).first).toString() !=
              update.sha256Hex) {
        downloaded = null;
        throw const UpdateFailure('Paquet modifié. Télécharge-le à nouveau.');
      }
      final result = await channel.invokeMethod<String>('install', {
        'path': file.path,
      });
      message = result == 'permission'
          ? 'Autorise AnisFlix à installer des apps, puis reviens et sélectionne Installer.'
          : Platform.isMacOS
          ? 'Archive affichée dans le Finder. Décompresse-la et remplace AnisFlix après avoir quitté l’app.'
          : 'Installation confiée à Android. Confirme dans la fenêtre système.';
    } catch (error) {
      message = error is UpdateFailure
          ? error.message
          : error is PlatformException
          ? error.message ?? 'Installation indisponible.'
          : 'Impossible d’ouvrir l’installateur.';
    }
    changed();
  }

  @override
  void dispose() {
    disposed = true;
    service.close();
    super.dispose();
  }
}
