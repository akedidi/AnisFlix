import 'package:flutter/material.dart';

import '../services/library.dart';

class ThemePicker extends StatelessWidget {
  final Library library;
  const ThemePicker({super.key, required this.library});
  @override
  Widget build(BuildContext context) => PopupMenuButton<ThemeMode>(
    tooltip: 'Apparence : clair / sombre',
    icon: Icon(
      Theme.of(context).brightness == Brightness.dark
          ? Icons.dark_mode_outlined
          : Icons.light_mode_outlined,
    ),
    initialValue: library.themeMode,
    onSelected: library.setThemeMode,
    itemBuilder: (_) => [
      for (final entry in const [
        (ThemeMode.light, 'Clair', Icons.light_mode_outlined),
        (ThemeMode.dark, 'Sombre', Icons.dark_mode_outlined),
        (ThemeMode.system, 'Système', Icons.brightness_auto_outlined),
      ])
        PopupMenuItem(
          value: entry.$1,
          child: Row(
            children: [
              Icon(entry.$3),
              const SizedBox(width: 12),
              Text(entry.$2),
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
