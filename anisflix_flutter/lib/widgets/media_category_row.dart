import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../screens/catalog.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';

class MediaCategoryRow extends StatelessWidget {
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
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  context.tr(title),
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
              TextButton(
                onPressed: seeAll,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(context.tr("Voir tout")),
                    SizedBox(width: 6),
                    Icon(Icons.chevron_right),
                  ],
                ),
              ),
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
            final width = tv ? 148.0 : 145.0;
            return SizedBox(
              height: width / .57,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                scrollDirection: Axis.horizontal,
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(width: 16),
                itemBuilder: (context, i) => SizedBox(
                  width: width,
                  child: MediaCard(
                    item: items[i],
                    library: library,
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
