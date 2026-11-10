import 'package:flutter/material.dart';

/// Apply the same mobile typography to every route, dialog and overlay.
class AppDisplay extends StatelessWidget {
  final bool mobile;
  final Widget child;

  const AppDisplay({super.key, required this.mobile, required this.child});

  @override
  Widget build(BuildContext context) {
    if (!mobile) return child;
    final theme = Theme.of(context);
    final text = theme.textTheme;
    final compact = text.copyWith(
      headlineLarge: text.headlineLarge?.copyWith(fontSize: 24, height: 1.2),
      headlineMedium: text.headlineMedium?.copyWith(fontSize: 22, height: 1.2),
      headlineSmall: text.headlineSmall?.copyWith(fontSize: 20, height: 1.2),
      titleLarge: text.titleLarge?.copyWith(
        fontSize: 18,
        height: 1.2,
        fontWeight: FontWeight.w700,
      ),
      titleMedium: text.titleMedium?.copyWith(fontSize: 15, height: 1.25),
      titleSmall: text.titleSmall?.copyWith(fontSize: 13, height: 1.25),
      labelLarge: text.labelLarge?.copyWith(fontSize: 13, height: 1.2),
    );
    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: 1.2,
      child: Theme(
        data: theme.copyWith(
          textTheme: compact,
          appBarTheme: theme.appBarTheme.copyWith(
            titleTextStyle: compact.titleLarge,
          ),
        ),
        child: child,
      ),
    );
  }
}
