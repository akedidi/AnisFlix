import 'package:anisflix_flutter/main.dart' as app;
import 'package:anisflix_flutter/screens/catalog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('real catalogue opens and desktop search works', (tester) async {
    await app.main();
    Future<void> waitFor(bool Function() ready) async {
      final deadline = DateTime.now().add(const Duration(seconds: 45));
      while (!ready()) {
        if (DateTime.now().isAfter(deadline)) {
          fail('The real catalogue did not become available.');
        }
        await tester.runAsync(
          () => Future<void>.delayed(const Duration(milliseconds: 250)),
        );
        await tester.pump();
      }
    }

    await tester.pump();
    await waitFor(() => find.byType(MediaCard).evaluate().isNotEmpty);
    expect(find.text('Derniers films'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Rechercher un film, une série ou un anime…'));
    await tester.pump();
    await tester.enterText(find.byType(TextField).first, 'Fight Club');
    await tester.pump(const Duration(milliseconds: 600));
    final result = find.byWidgetPredicate(
      (widget) =>
          widget is MediaCard &&
          widget.item.id == 550 &&
          widget.item.type == 'movie',
    );
    await waitFor(() => result.evaluate().isNotEmpty);
    await tester.tap(result.first);
    await tester.pump();
    await waitFor(() => find.text('Regarder').evaluate().isNotEmpty);
    expect(find.text('Regarder'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
