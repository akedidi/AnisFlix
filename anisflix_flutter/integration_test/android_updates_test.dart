import 'dart:io';

import 'package:anisflix_flutter/services/app_updates.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

// Dedicated emulator only. Serve fixtures with tool/serve_update_fixtures.py.
// No test endpoint or fixture is used by the production updater.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'Android validates update APKs and hands a compatible build to the system installer',
    (tester) async {
      final client = http.Client();
      addTearDown(client.close);
      final directory = Directory(
        '${(await getTemporaryDirectory()).path}/app-updates',
      );
      await directory.create(recursive: true);
      Future<File> stage(String name) async {
        final response = await client.send(
          http.Request('GET', Uri.parse('http://10.0.2.2:18765/$name')),
        );
        expect(response.statusCode, 200);
        final file = File('${directory.path}/$name');
        await response.stream.pipe(file.openWrite());
        return file;
      }

      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(body: Text('Validation de la mise à jour Android')),
        ),
      );
      await expectLater(
        UpdateController.channel.invokeMethod('install', {
          'path': '/etc/hosts',
        }),
        throwsA(isA<PlatformException>()),
      );
      final invalid = await File('${directory.path}/invalid.apk')
          .writeAsString('not an APK');
      await expectLater(
        UpdateController.channel.invokeMethod('install', {
          'path': invalid.path,
        }),
        throwsA(isA<PlatformException>()),
      );
      for (final name in [
        'incompatible.apk',
        'wrong-signer.apk',
        'same-build.apk',
      ]) {
        final file = await stage(name);
        await expectLater(
          UpdateController.channel.invokeMethod('install', {'path': file.path}),
          throwsA(isA<PlatformException>()),
          reason: name,
        );
        await file.delete();
      }
      final file = await stage('compatible.apk');
      expect(
        (await client.get(Uri.parse('http://10.0.2.2:18765/reset'))).statusCode,
        200,
      );
      expect(
        await UpdateController.channel.invokeMethod('install', {
          'path': file.path,
        }),
        'permission',
      );
      expect(
        (await client.get(Uri.parse('http://10.0.2.2:18765/allow'))).statusCode,
        200,
      );
      expect(
        await UpdateController.channel.invokeMethod('install', {
          'path': file.path,
        }),
        'installer',
      );
      // The harness confirms installation outside Flutter and verifies versionCode 6.
    },
    skip: !Platform.isAndroid,
    timeout: const Timeout(Duration(minutes: 5)),
  );
}
