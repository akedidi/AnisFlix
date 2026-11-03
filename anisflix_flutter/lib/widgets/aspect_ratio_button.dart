import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

enum VideoAspectMode {
  original('Original'),
  widescreen('16:9'),
  standard('4:3'),
  stretched('Étiré');

  final String label;
  const VideoAspectMode(this.label);

  double ratio(double original) => switch (this) {
    widescreen => 16 / 9,
    standard => 4 / 3,
    _ => original.isFinite && original > 0 ? original : 16 / 9,
  };

  BoxFit get fit => this == stretched ? BoxFit.fill : BoxFit.contain;
}

class AspectRatioButton extends StatelessWidget {
  final ValueListenable<VideoAspectMode> mode;
  final ValueChanged<VideoAspectMode> onSelected;
  const AspectRatioButton({
    super.key,
    required this.mode,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<VideoAspectMode>(
    valueListenable: mode,
    builder: (context, selected, _) => PopupMenuButton<VideoAspectMode>(
      key: const ValueKey('player-aspect-ratio'),
      tooltip: context.tr('Format d’image'),
      initialValue: selected,
      icon: const Icon(Icons.aspect_ratio, color: Colors.white),
      itemBuilder: (context) => [
        for (final mode in VideoAspectMode.values)
          CheckedPopupMenuItem(
            value: mode,
            checked: selected == mode,
            // Video controls can fade out while this menu stays open. Handle
            // the choice in the menu route even if its button has unmounted.
            onTap: () => onSelected(mode),
            child: Text(context.tr(mode.label)),
          ),
      ],
    ),
  );
}
