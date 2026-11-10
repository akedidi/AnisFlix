import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

import '../services/library.dart';

class ThemePicker extends StatelessWidget {
  final Library library;
  const ThemePicker({super.key, required this.library});
  @override
  Widget build(BuildContext context) => PopupMenuButton<ThemeMode>(
    tooltip: context.tr("Apparence : clair / sombre"),
    icon: Icon(
      Theme.of(context).brightness == Brightness.dark
          ? Icons.dark_mode_outlined
          : Icons.light_mode_outlined,
    ),
    initialValue: library.themeMode,
    onSelected: library.setThemeMode,
    itemBuilder: (_) => [
      for (final entry in [
        (ThemeMode.light, context.tr("Clair"), Icons.light_mode_outlined),
        (ThemeMode.dark, context.tr("Sombre"), Icons.dark_mode_outlined),
        (
          ThemeMode.system,
          context.tr("Système"),
          Icons.brightness_auto_outlined,
        ),
      ])
        PopupMenuItem(
          value: entry.$1,
          child: Row(
            children: [
              Icon(entry.$3),
              const SizedBox(width: 12),
              Text(context.tr(entry.$2)),
              if (entry.$1 == library.themeMode) ...[
                const SizedBox(width: 16),
                const Icon(Icons.check, size: 18),
              ],
            ],
          ),
        ),
    ],
  );
}
