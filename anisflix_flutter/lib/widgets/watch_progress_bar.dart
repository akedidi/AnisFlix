import 'package:flutter/material.dart';

import '../models/media.dart';
import '../services/library.dart';

class WatchProgressBar extends StatelessWidget {
  final Library library;
  final MediaItem item;
  final int? season, episode;
  final EdgeInsetsGeometry padding;

  const WatchProgressBar({
    super.key,
    required this.library,
    required this.item,
    this.season,
    this.episode,
    this.padding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: library,
    builder: (context, _) {
      final fraction = library.progressFraction(
        item,
        season: season,
        episode: episode,
      );
      if (fraction == null) return const SizedBox.shrink();
      return Padding(
        padding: padding,
        child: LinearProgressIndicator(
          value: fraction,
          minHeight: 4,
          backgroundColor: Theme.of(context)
              .colorScheme
              .surfaceContainerHighest,
        ),
      );
    },
  );
}
