import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';

class MobileNavigationBar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;

  const MobileNavigationBar({
    super.key,
    required this.selectedIndex,
    required this.onDestinationSelected,
  });

  @override
  Widget build(BuildContext context) {
    final destinations = [
      (Icons.home_outlined, context.tr('Accueil')),
      (Icons.search, context.tr('Explorer')),
      (Icons.download_outlined, context.tr('Téléch.')),
      (Icons.favorite_outline, context.tr('Favoris')),
      (Icons.settings_outlined, context.tr('Paramètres')),
    ];
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(10, 0, 10, 4),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: LayoutBuilder(
          builder: (context, constraints) {
            const baseStyle = TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              letterSpacing: 0,
              height: 1.2,
            );
            final textScaler = MediaQuery.textScalerOf(context)
                .clamp(maxScaleFactor: 1.3);
            var widestLabel = 0.0;
            for (final (_, label) in destinations) {
              final painter = TextPainter(
                text: TextSpan(
                  text: label,
                  style: DefaultTextStyle.of(context).style.merge(baseStyle),
                ),
                textDirection: Directionality.of(context),
                textScaler: textScaler,
                maxLines: 1,
              )..layout();
              widestLabel = math.max(widestLabel, painter.width);
              painter.dispose();
            }
            final labelWidth = constraints.maxWidth / destinations.length - 8;
            final fontSize = (12 * labelWidth / widestLabel).clamp(8.0, 12.0);
            return NavigationBar(
              height: 66,
              selectedIndex: selectedIndex,
              onDestinationSelected: onDestinationSelected,
              labelTextStyle: WidgetStatePropertyAll(
                baseStyle.copyWith(fontSize: fontSize),
              ),
              destinations: [
                for (final (icon, label) in destinations)
                  DefaultTextStyle.merge(
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                    child: NavigationDestination(
                      icon: Icon(icon),
                      label: label,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
