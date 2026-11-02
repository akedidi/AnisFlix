import 'dart:convert';
import 'dart:io';

import 'package:anisflix_flutter/services/app_updates.dart';
import 'package:anisflix_flutter/widgets/update_panel.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

const target = UpdateTarget(
  'macos',
  'com.anisflix.reconstructed.anisflixFlutter',
);
final payload = utf8.encode('a verified release archive');
final digest = sha256.convert(payload).toString();
Map<String, dynamic> release(
  String tag, {
  bool manifest = true,
  bool prerelease = false,
}) => {
  'tag_name': tag,
  'draft': false,
  'prerelease': prerelease,
  'body': 'Notes',
  'assets': [
    if (manifest)
      {
        'name': updateManifestName,
        'browser_download_url':
            'https://github.com/$updateRepository/releases/download/$tag/$updateManifestName',
      },
    {
      'name': 'AnisFlix-macOS.zip',
      'size': payload.length,
      'browser_download_url':
          'https://github.com/$updateRepository/releases/download/$tag/AnisFlix-macOS.zip',
    },
  ],
};
Map<String, dynamic> manifest(
  String version,
  int build, {
  String packageId = 'com.anisflix.reconstructed.anisflixFlutter',
  String? hash,
}) => {
  'schema': 1,
  'track': updateTrack,
  'version': version,
  'build': build,
  'platforms': {
    'macos': {
      'packageId': packageId,
      'asset': 'AnisFlix-macOS.zip',
      'sha256': hash ?? digest,
      'size': payload.length,
    },
  },
};
UpdateService fixture(
  List<Map<String, dynamic>> releases,
  Map<String, Map<String, dynamic>> manifests,
) => UpdateService(
  client: MockClient((r) async {
    if (r.url.host == 'api.github.com') {
      return http.Response(jsonEncode(releases), 200);
    }
    return http.Response(
      jsonEncode(manifests[r.url.pathSegments[r.url.pathSegments.length - 2]]),
      200,
    );
  }),
);
void main() {
  test(
    'update channel follows installed package rather than device UI mode',
    () {
      expect(
        UpdateTarget.forPackage(
          'android',
          'com.anisflix.reconstructed.anisflix_flutter.mobile',
        ).platform,
        'android-mobile',
      );
      expect(
        UpdateTarget.forPackage(
          'android',
          'com.anisflix.reconstructed.anisflix_flutter.tv',
        ).platform,
        'android-tv',
      );
      expect(
        UpdateTarget.forPackage(
          'macos',
          'com.anisflix.reconstructed.anisflixFlutter',
        ).platform,
        'macos',
      );
    },
  );
  test(
    'uses semantic version and build rather than release/tag order',
    () async {
      final service = fixture(
        [
          release('new-tag-old-build'),
          release('old-tag-new-build'),
          release('preview', prerelease: true),
        ],
        {
          'new-tag-old-build': manifest('0.5.1', 6),
          'old-tag-new-build': manifest('0.6.0', 7),
          'preview': manifest('9.0.0', 90),
        },
      );
      addTearDown(service.close);
      final update = await service.check(target, AppVersion.parse('0.5.0', 5));
      expect(update!.version.toString(), '0.6.0+7');
      expect(update.url.path, contains('old-tag-new-build'));
    },
  );
  test(
    'rejects downgrades, foreign package IDs and original APK releases',
    () async {
      final service = fixture(
        [
          release('original', manifest: false),
          release('foreign'),
          release('downgrade'),
        ],
        {
          'foreign': manifest('3.0.0', 90, packageId: 'com.original.app'),
          'downgrade': manifest('2.0.0', 4),
        },
      );
      addTearDown(service.close);
      expect(await service.check(target, AppVersion.parse('0.5.0', 5)), isNull);
    },
  );
  test('same version with a higher build is an update', () async {
    final service = fixture(
      [release('rebuild')],
      {'rebuild': manifest('0.5.0', 6)},
    );
    addTearDown(service.close);
    expect(
      (await service.check(
        target,
        AppVersion.parse('0.5.0', 5),
      ))!.version.build,
      6,
    );
  });
  test('GitHub outage is an error, never an up-to-date result', () async {
    final service = UpdateService(
      client: MockClient((_) async => http.Response('', 403)),
    );
    addTearDown(service.close);
    await expectLater(
      service.check(target, AppVersion.parse('0.5.0', 5)),
      throwsA(isA<UpdateFailure>()),
    );
  });
  test('rejects an asset outside the project release', () async {
    final row = release('bad');
    (row['assets'] as List)[1]['browser_download_url'] =
        'https://example.com/AnisFlix-macOS.zip';
    final service = fixture([row], {'bad': manifest('0.6.0', 6)});
    addTearDown(service.close);
    await expectLater(
      service.check(target, AppVersion.parse('0.5.0', 5)),
      throwsA(isA<UpdateFailure>()),
    );
  });
  test('rejects invalid checksum metadata before downloading', () async {
    final service = fixture(
      [release('bad')],
      {'bad': manifest('0.6.0', 6, hash: 'invalid')},
    );
    addTearDown(service.close);
    await expectLater(
      service.check(target, AppVersion.parse('0.5.0', 5)),
      throwsA(isA<UpdateFailure>()),
    );
  });
  for (final corrupt in [false, true]) {
    test(
      'download ${corrupt ? 'rejects corrupt bytes and removes partial file' : 'verifies size and checksum'}',
      () async {
        final dir = await Directory.systemTemp.createTemp(
          'anisflix-update-test',
        );
        addTearDown(() => dir.delete(recursive: true));
        final bytes = corrupt ? List<int>.filled(payload.length, 0) : payload;
        final service = UpdateService(
          client: MockClient((_) async => http.Response.bytes(bytes, 200)),
        );
        addTearDown(service.close);
        final update = AppUpdate(
          version: AppVersion.parse('0.6.0', 6),
          url: Uri.parse(
            'https://github.com/$updateRepository/releases/download/test/AnisFlix-macOS.zip',
          ),
          releasePage: Uri.parse(
            'https://github.com/$updateRepository/releases/tag/test',
          ),
          filename: 'AnisFlix-macOS.zip',
          sha256Hex: digest,
          size: payload.length,
          notes: '',
        );
        final values = <double>[];
        if (corrupt) {
          await expectLater(
            service.download(update, dir, values.add),
            throwsA(isA<UpdateFailure>()),
          );
          expect(await dir.list().isEmpty, isTrue);
        } else {
          final file = await service.download(update, dir, values.add);
          expect(await file.readAsBytes(), payload);
          expect(values.last, 1);
          expect(await File('${file.path}.part').exists(), isFalse);
        }
      },
    );
  }
  test(
    'release pagination checks compatible manifests beyond the first page',
    () async {
      var pages = 0;
      final service = UpdateService(
        client: MockClient((r) async {
          if (r.url.host == 'api.github.com') {
            pages++;
            return http.Response(
              jsonEncode(
                r.url.queryParameters['page'] == '1'
                    ? List.generate(
                        100,
                        (i) => release('original-$i', manifest: false),
                      )
                    : [release('second-page')],
              ),
              200,
            );
          }
          return http.Response(jsonEncode(manifest('0.6.0', 6)), 200);
        }),
      );
      addTearDown(service.close);
      expect(
        (await service.check(
          target,
          AppVersion.parse('0.5.0', 5),
        ))!.version.build,
        6,
      );
      expect(pages, 2);
    },
  );
  test('a truncated download leaves no installable file', () async {
    final directory = await Directory.systemTemp.createTemp(
      'anisflix-truncated',
    );
    addTearDown(() => directory.delete(recursive: true));
    final service = UpdateService(
      client: MockClient((_) async => http.Response.bytes([0], 200)),
    );
    addTearDown(service.close);
    final update = AppUpdate(
      version: AppVersion.parse('0.6.0', 6),
      url: Uri.parse(
        'https://github.com/$updateRepository/releases/download/test/test.zip',
      ),
      releasePage: Uri.parse(
        'https://github.com/$updateRepository/releases/tag/test',
      ),
      filename: 'test.zip',
      sha256Hex: digest,
      size: payload.length,
      notes: '',
    );
    await expectLater(
      service.download(update, directory, (_) {}),
      throwsA(isA<UpdateFailure>()),
    );
    expect(await directory.list().isEmpty, isTrue);
  });
  test('a changed download is rejected again before invoking the installer', () async {
    SharedPreferences.setMockInitialValues({});
    final directory = await Directory.systemTemp.createTemp('anisflix-changed');
    addTearDown(() => directory.delete(recursive: true));
    final controller = UpdateController(await SharedPreferences.getInstance());
    addTearDown(controller.dispose);
    controller.available = AppUpdate(
      version: AppVersion.parse('0.6.0', 6),
      url: Uri.parse(
        'https://github.com/$updateRepository/releases/download/test/test.zip',
      ),
      releasePage: Uri.parse(
        'https://github.com/$updateRepository/releases/tag/test',
      ),
      filename: 'test.zip',
      sha256Hex: digest,
      size: payload.length,
      notes: '',
    );
    controller.downloaded = await File('${directory.path}/test.zip')
        .writeAsBytes(List<int>.filled(payload.length, 0));
    var calls = 0;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(UpdateController.channel, (call) async {
          calls++;
          return 'installer';
        });
    addTearDown(
      () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(UpdateController.channel, null),
    );
    await controller.install();
    expect(calls, 0);
    expect(controller.downloaded, isNull);
    expect(controller.message, contains('Paquet modifié'));
  });
  test('disabled automatic checks never contact the feed at startup', () async {
    SharedPreferences.setMockInitialValues({'automaticUpdates': false});
    PackageInfo.setMockInitialValues(
      appName: 'AnisFlix',
      packageName: target.packageId,
      version: '0.5.0',
      buildNumber: '5',
      buildSignature: 'fixture',
    );
    var calls = 0;
    final controller = UpdateController(
      await SharedPreferences.getInstance(),
      service: UpdateService(
        client: MockClient((_) async {
          calls++;
          return http.Response('[]', 200);
        }),
      ),
    );
    addTearDown(controller.dispose);
    await controller.initialize();
    expect(calls, 0);
    await controller.check();
    expect(calls, 1);
    expect(controller.message, contains('Aucune mise à jour compatible'));
  });
  testWidgets(
    'settings distinguish check failures and preserve automatic choice',
    (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final controller = UpdateController(
        prefs,
        service: UpdateService(
          client: MockClient((_) async => http.Response('', 500)),
        ),
      );
      addTearDown(controller.dispose);
      controller.installed = AppVersion.parse('0.5.0', 5);
      controller.target = target;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: UpdatePanel(controller: controller)),
        ),
      );
      await tester.tap(find.text('Vérifier les mises à jour'));
      await tester.pumpAndSettle();
      expect(find.textContaining('HTTP 500'), findsOneWidget);
      expect(find.textContaining('Aucune mise à jour'), findsNothing);
      await controller.setAutomatic(false);
      expect(prefs.getBool('automaticUpdates'), isFalse);
      expect(find.text('Télécharger la mise à jour'), findsNothing);
    },
  );
}
