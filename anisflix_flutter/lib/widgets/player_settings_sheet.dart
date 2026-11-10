import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../services/platform_bridge.dart';

class PlayerSettingsSheet extends StatelessWidget {
  final String title;
  final Widget child;
  const PlayerSettingsSheet({
    super.key,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  context.tr(title),
                  style: const TextStyle(
                    color: Color(0xffded8e0),
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(context.tr('Fermer')),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Flexible(child: SingleChildScrollView(child: child)),
        ],
      ),
    ),
  );
}

class PlayerSettingOption extends StatelessWidget {
  final Widget child;
  final bool selected;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  const PlayerSettingOption({
    super.key,
    required this.child,
    this.selected = false,
    this.onTap,
    this.padding = const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Material(
      color: selected ? const Color(0xff60242f) : const Color(0xff20242b),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? const Color(0xffed214d) : const Color(0xff363a42),
          width: selected ? 3 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: padding,
          child: Row(
            children: [
              Expanded(child: child),
              if (selected) const Icon(Icons.check, color: Color(0xffed214d)),
            ],
          ),
        ),
      ),
    ),
  );
}

Future<T?> showPlayerSettings<T>(
  BuildContext context,
  Widget child, {
  double tvWidthFraction = .75,
}) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  backgroundColor: const Color(0xff33292a),
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
  ),
  constraints: BoxConstraints(
    maxHeight: MediaQuery.sizeOf(context).height * .8,
    maxWidth: PlatformBridge.deviceIsTv || const bool.fromEnvironment('TV_MODE')
        ? MediaQuery.sizeOf(context).width * tvWidthFraction
        : double.infinity,
  ),
  builder: (context) => SliderTheme(
    data: SliderTheme.of(context).copyWith(
      activeTrackColor: const Color(0xffed214d),
      thumbColor: const Color(0xffed214d),
      inactiveTrackColor: const Color(0xff505158),
    ),
    child: child,
  ),
);
