import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:anisflix_flutter/app.dart';
import 'package:anisflix_flutter/services/app_updates.dart';
import 'package:anisflix_flutter/widgets/update_panel.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:integration_test/integration_test.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'real GitHub releases do not propose an incompatible APK to macOS',
    (tester) async {
      final service = UpdateService();
      addTearDown(service.close);
      final result = await service.check(
        const UpdateTarget(
          'macos',
          'com.anisflix.reconstructed.anisflixFlutter',
        ),
        AppVersion.parse('0.5.0', 5),
      );
      expect(
        result,
        isNull,
      ); // Current public feed has only the original Android APKs.
    },
    skip: !Platform.isMacOS,
  );

  testWidgets(
    'verified macOS archive reaches Finder and invalid paths are rejected',
    (tester) async {
      final info = await PackageInfo.fromPlatform();
      final prefs = await SharedPreferences.getInstance();
      // Controlled empty ZIP fixture, no installation or application replacement.
      final bytes = base64Decode('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==');
      final service = UpdateService(
        client: MockClient((_) async => http.Response.bytes(bytes, 200)),
      );
      final controller = UpdateController(prefs, service: service);
      addTearDown(controller.dispose);
      controller.installed = AppVersion.parse(
        info.version,
        int.parse(info.buildNumber),
      );
      controller.target = UpdateTarget('macos', info.packageName);
      controller.available = AppUpdate(
        version: AppVersion.parse('99.0.0', 99),
        url: Uri.parse(
          'https://github.com/$updateRepository/releases/download/test/AnisFlix-test.zip',
        ),
        releasePage: Uri.parse(
          'https://github.com/$updateRepository/releases/tag/test',
        ),
        filename: 'AnisFlix-test.zip',
        sha256Hex: sha256.convert(bytes).toString(),
        size: bytes.length,
        notes: 'Fixture de validation locale',
      );
      const key = ValueKey('updates-capture');
      await tester.pumpWidget(
        MaterialApp(
          theme: appTheme(Brightness.dark),
          home: Scaffold(
            body: RepaintBoundary(
              key: key,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: UpdatePanel(controller: controller),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Télécharger la mise à jour'));
      await tester.pumpAndSettle();
      // The HTTP/file work uses real async IO rather than frame pumping.
      for (var i = 0; i < 100 && controller.downloaded == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 50));
        await tester.pump();
      }
      expect(controller.downloaded, isNotNull, reason: controller.message);
      await tester.tap(find.text('Afficher dans le Finder'));
      await tester.pumpAndSettle();
      expect(controller.message, contains('Archive affichée'));
      final image = await tester
          .renderObject<RenderRepaintBoundary>(find.byKey(key))
          .toImage(pixelRatio: 1.5);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      final tmp = await getTemporaryDirectory();
      await File('${tmp.path}/anisflix-updates-native.png')
          .writeAsBytes(png!.buffer.asUint8List());
      image.dispose();
      await expectLater(
        UpdateController.channel.invokeMethod('install', {
          'path': '/etc/hosts',
        }),
        throwsA(isA<PlatformException>()),
      );
      await controller.downloaded!.delete();
    },
    skip: !Platform.isMacOS,
  );
}
