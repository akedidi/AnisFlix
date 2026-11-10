import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../services/library.dart';

/// The same 50–150% preference in settings and in the player.
class SubtitleSizeControl extends StatelessWidget {
  final double fontSize;
  final ValueChanged<double>? onChanged;

  const SubtitleSizeControl({
    super.key,
    required this.fontSize,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final percent = (fontSize / Library.defaultSubtitleFontSize * 100).clamp(
      50.0,
      150.0,
    );
    void change(double value) => onChanged?.call(
      value.clamp(50.0, 150.0) / 100 * Library.defaultSubtitleFontSize,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text(context.tr('Taille du texte'))),
            Text('${percent.round()}%'),
          ],
        ),
        Row(
          children: [
            IconButton(
              tooltip: context.tr('Réduire la taille des sous-titres'),
              onPressed: onChanged == null || percent <= 50
                  ? null
                  : () => change(percent - 10),
              icon: const Text('A', style: TextStyle(fontSize: 12)),
            ),
            Expanded(
              child: Slider(
                value: percent,
                min: 50,
                max: 150,
                divisions: 10,
                label: '${percent.round()}%',
                semanticFormatterCallback: (value) => '${value.round()}%',
                onChanged: onChanged == null ? null : change,
              ),
            ),
            IconButton(
              tooltip: context.tr('Augmenter la taille des sous-titres'),
              onPressed: onChanged == null || percent >= 150
                  ? null
                  : () => change(percent + 10),
              icon: const Text('A', style: TextStyle(fontSize: 22)),
            ),
          ],
        ),
      ],
    );
  }
}
