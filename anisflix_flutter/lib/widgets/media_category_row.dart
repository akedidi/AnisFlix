import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show ScrollCacheExtent;
import 'package:flutter/services.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../screens/catalog.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import '../services/platform_bridge.dart';

class MediaCategoryRow extends StatelessWidget {
  // Keep the next carousel header mounted even if it is just off screen.
  static const tvScrollCacheExtent = ScrollCacheExtent.pixels(400);

  final String title;
  final Future<MediaPage> future;
  final Library library;
  final bool tv;
  final VoidCallback seeAll, retry;
  final ValueChanged<MediaItem> onSelected;

  const MediaCategoryRow({
    super.key,
    required this.title,
    required this.future,
    required this.library,
    required this.tv,
    required this.seeAll,
    required this.retry,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 12, bottom: 16),
    child: Column(
      children: [
        Padding(
          padding: EdgeInsets.symmetric(
            horizontal: PlatformBridge.android && !tv ? 16 : 24,
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  context.tr(title),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
              _SeeAllButton(tv: tv, onPressed: seeAll),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FutureBuilder(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      context.tr(
                        "Ce catalogue est momentanément indisponible.",
                      ),
                    ),
                    TextButton(
                      onPressed: retry,
                      child: Text(context.tr("Réessayer")),
                    ),
                  ],
                ),
              );
            }
            if (!snapshot.hasData) {
              return const SizedBox(
                height: 180,
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (snapshot.data!.items.isEmpty) {
              return Padding(
                padding: EdgeInsets.all(16),
                child: Text(context.tr("Aucun titre pour le moment.")),
              );
            }
            final items = snapshot.data!.items;
            final width = MediaCard.categoryWidth(tv: tv);
            return SizedBox(
              height: MediaCard.heightForWidth(
                width,
                compact: tv || PlatformBridge.android,
                textScaler: MediaQuery.textScalerOf(context),
              ),
              child: ListView.separated(
                padding: EdgeInsets.symmetric(
                  horizontal: PlatformBridge.android && !tv ? 16 : 24,
                ),
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, _) =>
                    SizedBox(width: tv || PlatformBridge.android ? 10 : 16),
                itemBuilder: (context, i) => SizedBox(
                  width: width,
                  child: MediaCard(
                    item: items[i],
                    library: library,
                    compact: tv || PlatformBridge.android,
                    onTap: () => onSelected(items[i]),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    ),
  );
}

class _SeeAllFocusNode extends FocusNode {}

class _SeeAllButton extends StatefulWidget {
  const _SeeAllButton({required this.tv, required this.onPressed});

  final bool tv;
  final VoidCallback onPressed;

  @override
  State<_SeeAllButton> createState() => _SeeAllButtonState();
}

class _SeeAllButtonState extends State<_SeeAllButton> {
  final node = _SeeAllFocusNode();

  @override
  void dispose() {
    node.dispose();
    super.dispose();
  }

  KeyEventResult moveBetweenCarousels(FocusNode _, KeyEvent event) {
    if (!widget.tv || (event is! KeyDownEvent && event is! KeyRepeatEvent)) {
      return KeyEventResult.ignored;
    }
    final down = event.logicalKey == LogicalKeyboardKey.arrowDown;
    if (!down && event.logicalKey != LogicalKeyboardKey.arrowUp) {
      return KeyEventResult.ignored;
    }
    final scrollable = Scrollable.maybeOf(context, axis: Axis.vertical);
    final top = node.rect.top;
    _SeeAllFocusNode? next;
    var nearest = double.infinity;
    for (final candidate
        in node.nearestScope!.traversalDescendants
            .whereType<_SeeAllFocusNode>()) {
      final target = candidate.context;
      if (target == null ||
          Scrollable.maybeOf(target, axis: Axis.vertical) != scrollable) {
        continue;
      }
      final distance = (candidate.rect.top - top) * (down ? 1 : -1);
      if (distance > 0 && distance < nearest) {
        next = candidate;
        nearest = distance;
      }
    }
    if (next == null) return KeyEventResult.ignored;
    next.requestFocus();
    unawaited(
      Scrollable.ensureVisible(
        next.context!,
        duration: const Duration(milliseconds: 180),
        alignmentPolicy: down
            ? ScrollPositionAlignmentPolicy.keepVisibleAtEnd
            : ScrollPositionAlignmentPolicy.keepVisibleAtStart,
      ),
    );
    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) => Focus(
    canRequestFocus: false,
    onKeyEvent: moveBetweenCarousels,
    child: TextButton(
      focusNode: node,
      onPressed: widget.onPressed,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(context.tr("Voir tout")),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right),
        ],
      ),
    ),
  );
}
