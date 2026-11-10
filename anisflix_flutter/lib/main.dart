import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';

import 'app.dart';
import 'services/library.dart';
import 'services/downloads.dart';
import 'services/platform_bridge.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  await PlatformBridge.initialize();
  final library = await Library.load();
  await library.trakt.restore();
  await Downloads.cleanupInterrupted();
  runApp(AnisFlixApp(library: library));
}
