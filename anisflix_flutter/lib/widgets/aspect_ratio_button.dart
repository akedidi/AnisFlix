import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'player_settings_sheet.dart';

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
  final Color color;
  final bool releaseStyle;
  final bool tv;
  final VoidCallback? onMenuOpen, onMenuClose;
  const AspectRatioButton({
    super.key,
    required this.mode,
    required this.onSelected,
    this.color = Colors.white,
    this.releaseStyle = false,
    this.tv = false,
    this.onMenuOpen,
    this.onMenuClose,
  });

  @override
  Widget build(BuildContext context) => ValueListenableBuilder<VideoAspectMode>(
    valueListenable: mode,
    builder: (context, selected, _) => releaseStyle
        ? IconButton(
            key: const ValueKey('player-aspect-ratio'),
            style: tv
                ? ButtonStyle(
                    minimumSize: const WidgetStatePropertyAll(Size.square(56)),
                    fixedSize: const WidgetStatePropertyAll(Size.square(56)),
                    shape: const WidgetStatePropertyAll(CircleBorder()),
                    backgroundColor: WidgetStateProperty.resolveWith(
                      (states) => states.contains(WidgetState.focused)
                          ? const Color(0xffed214d)
                          : Colors.transparent,
                    ),
                    side: WidgetStateProperty.resolveWith(
                      (states) => BorderSide(
                        color: states.contains(WidgetState.focused)
                            ? Colors.white
                            : Colors.white38,
                        width: states.contains(WidgetState.focused) ? 4 : 1,
                      ),
                    ),
                  )
                : null,
            tooltip: context.tr('Format d’image'),
            icon: Icon(Icons.aspect_ratio, color: color),
            onPressed: () async {
              onMenuOpen?.call();
              try {
                await showPlayerSettings<void>(
                  context,
                  PlayerSettingsSheet(
                    title: 'Format d’image',
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (final value in VideoAspectMode.values)
                          PlayerSettingOption(
                            selected: value == mode.value,
                            onTap: () {
                              onSelected(value);
                              Navigator.pop(context);
                            },
                            child: Row(
                              children: [
                                Icon(switch (value) {
                                  VideoAspectMode.original =>
                                    Icons.image_outlined,
                                  VideoAspectMode.widescreen => Icons.crop_16_9,
                                  VideoAspectMode.standard =>
                                    Icons.crop_landscape,
                                  VideoAspectMode.stretched => Icons.open_with,
                                }, color: Colors.white),
                                const SizedBox(width: 16),
                                Text(
                                  context.tr(
                                    value == VideoAspectMode.stretched
                                        ? 'Étirer'
                                        : value.label,
                                  ),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                  tvWidthFraction: 7 / 12,
                );
              } finally {
                onMenuClose?.call();
              }
            },
          )
        : PopupMenuButton<VideoAspectMode>(
            key: const ValueKey('player-aspect-ratio'),
            tooltip: context.tr('Format d’image'),
            initialValue: selected,
            icon: Icon(Icons.aspect_ratio, color: color),
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
