import 'package:flutter/material.dart';

import 'cached_media_image.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';

class ResumeCard extends StatelessWidget {
  final MediaItem item;
  final double progress;
  final VoidCallback onTap;

  const ResumeCard({
    super.key,
    required this.item,
    required this.progress,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 280,
    child: Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 72,
              child: ColoredBox(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                child: item.posterUrl == null
                    ? const Center(child: Icon(Icons.movie_outlined, size: 32))
                    : CachedMediaImage(
                        item.posterUrl!,
                        fit: BoxFit.cover,
                        excludeFromSemantics: true,
                        errorBuilder: (_, _, _) => const Center(
                          child: Icon(Icons.movie_outlined, size: 32),
                        ),
                      ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.l10n.mediaTitle(item.title),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    LinearProgressIndicator(value: progress),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
