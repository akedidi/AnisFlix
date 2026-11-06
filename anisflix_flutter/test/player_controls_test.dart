import 'package:anisflix_flutter/widgets/player_controls_overlay.dart';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

double opacity(WidgetTester tester) => tester
    .widget<AnimatedOpacity>(
      find.byKey(const ValueKey('player-controls-visibility')),
    )
    .opacity;

void main() {
  testWidgets('a late drag release after leaving the player creates no timer', (
    tester,
  ) async {
    late VoidCallback release;
    await tester.pumpWidget(
      MaterialApp(
        home: PlayerControlsOverlay(
          onExit: () {},
          onDoubleTap: () {},
          shortcuts: const {},
          builder: (_, end) {
            release = end;
            return const SizedBox.expand();
          },
        ),
      ),
    );
    await tester.pumpWidget(const SizedBox());
    release();
    await tester.pump(const Duration(seconds: 4));
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'PiP drags work with hidden controls and preserve button clicks',
    (tester) async {
      var drags = 0;
      var clicks = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: PlayerControlsOverlay(
            onExit: () {},
            onDoubleTap: () {},
            onDragStart: () async {
              drags++;
            },
            shortcuts: const {},
            builder: (_, _) => Center(
              child: IconButton(
                onPressed: () {
                  clicks++;
                },
                icon: const Icon(Icons.pause),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.byType(IconButton));
      expect(clicks, 1);
      expect(drags, 0);
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(opacity(tester), 0);
      await tester.dragFrom(const Offset(40, 40), const Offset(120, 60));
      expect(drags, 1);
      expect(clicks, 1);
      await tester.tapAt(const Offset(40, 40));
      await tester.pumpAndSettle();
      expect(opacity(tester), 1);
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();
      expect(opacity(tester), 0);
      await tester.pumpWidget(const SizedBox());
    },
  );
  Future<void> showPlayer(
    WidgetTester tester, {
    bool fullscreen = false,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => Navigator.push<void>(
              context,
              MaterialPageRoute(
                builder: (_) => Scaffold(
                  body: StatefulBuilder(
                    builder: (context, setState) {
                      return PlayerControlsOverlay(
                        onExit: () {
                          if (fullscreen) {
                            setState(() => fullscreen = false);
                          } else {
                            Navigator.pop(context);
                          }
                        },
                        onDoubleTap: () {},
                        shortcuts: const {},
                        builder: (_, _) => Column(
                          children: [
                            Text(fullscreen ? 'Plein écran' : 'Vidéo'),
                            TextButton(
                              onPressed: () => showDialog<void>(
                                context: context,
                                builder: (_) => const AlertDialog(
                                  title: Text('Sous-titres'),
                                ),
                              ),
                              child: const Text('Réglages'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
            child: const Text('Ouvrir'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Ouvrir'));
    await tester.pumpAndSettle();
  }

  Future<void> escape(WidgetTester tester) async {
    await tester.sendKeyEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
  }

  testWidgets('Escape hides controls before leaving the video', (tester) async {
    await showPlayer(tester);
    expect(opacity(tester), 1);
    await escape(tester);
    expect(opacity(tester), 0);
    expect(find.byType(PlayerControlsOverlay), findsOneWidget);
    await escape(tester);
    expect(find.byType(PlayerControlsOverlay), findsNothing);
    expect(find.text('Ouvrir'), findsOneWidget);
  });

  testWidgets('Escape leaves fullscreen only after hiding controls', (
    tester,
  ) async {
    await showPlayer(tester, fullscreen: true);
    await escape(tester);
    expect(find.text('Plein écran'), findsOneWidget);
    await escape(tester);
    expect(find.text('Vidéo'), findsOneWidget);
    expect(opacity(tester), 0);
  });

  testWidgets('holding Escape does not exit after hiding controls', (
    tester,
  ) async {
    await showPlayer(tester);
    await tester.sendKeyDownEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(opacity(tester), 0);
    await tester.sendKeyRepeatEvent(LogicalKeyboardKey.escape);
    await tester.pumpAndSettle();
    expect(find.byType(PlayerControlsOverlay), findsOneWidget);
    await tester.sendKeyUpEvent(LogicalKeyboardKey.escape);
    await escape(tester);
    expect(find.byType(PlayerControlsOverlay), findsNothing);
  });

  testWidgets('auto-hide and mouse reveal share the Escape behavior', (
    tester,
  ) async {
    await showPlayer(tester);
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(opacity(tester), 0);
    final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await mouse.addPointer(location: const Offset(10, 10));
    await mouse.moveTo(const Offset(300, 200));
    await tester.pumpAndSettle();
    expect(opacity(tester), 1);
    await escape(tester);
    expect(opacity(tester), 0);
    await mouse.removePointer();
    await escape(tester);
    expect(find.byType(PlayerControlsOverlay), findsNothing);
  });

  testWidgets('Escape closes the subtitle dialog before changing the player', (
    tester,
  ) async {
    await showPlayer(tester);
    await tester.tap(find.text('Réglages'));
    await tester.pumpAndSettle();
    await escape(tester);
    expect(find.byType(AlertDialog), findsNothing);
    expect(opacity(tester), 1);
    await escape(tester);
    expect(opacity(tester), 0);
  });
}
