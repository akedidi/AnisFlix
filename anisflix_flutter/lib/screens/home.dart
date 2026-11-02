import 'dart:async';

import 'package:flutter/material.dart';

import '../models/media.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import 'catalog.dart';
import 'details.dart';

class HomeScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final bool tv;
  const HomeScreen({
    super.key,
    required this.api,
    required this.library,
    required this.tv,
  });
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<MediaPage> movies, series, anime;
  int hero = 0;
  bool heroFocused = false;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    reload();
    timer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted && !heroFocused) setState(() => hero = (hero + 1) % 5);
    });
  }

  void reload() {
    movies = widget.api.list('movie', latest: true);
    series = widget.api.list('tv', latest: true);
    anime = widget.api.list('tv', anime: true);
    // Each row owns its error UI. Attach a handler immediately, before it scrolls into view.
    for (final future in [movies, series, anime]) {
      unawaited(
        future.then<void>((_) {}, onError: (Object _, StackTrace _) {}),
      );
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  void details(MediaItem item, {int? season, int? episode}) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => DetailScreen(
        api: widget.api,
        library: widget.library,
        item: item,
        initialSeason: season,
        initialEpisode: episode,
      ),
    ),
  );
  void all(int section, {bool latest = false}) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(
          title: Text(
            section == 1
                ? 'Films'
                : section == 2
                ? 'Séries'
                : 'Animés',
          ),
        ),
        body: CatalogScreen(
          api: widget.api,
          library: widget.library,
          section: section,
          tv: widget.tv,
          latestOverride: latest,
        ),
      ),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final resume =
        widget.library.progress.values
            .where(
              (p) =>
                  (p['media'] as Map)['media_type'] != 'external' &&
                  (p['position'] as num) > 30 &&
                  (p['position'] as num) < (p['duration'] as num) * .95,
            )
            .toList()
          ..sort(
            (a, b) =>
                (b['updated'] as String).compareTo(a['updated'] as String),
          );
    return ListView(
      children: [
        FutureBuilder(
          future: movies,
          builder: (context, snapshot) {
            final rows = snapshot.data?.items ?? [];
            if (rows.isEmpty) return const SizedBox(height: 16);
            final item = rows[hero % rows.length.clamp(1, 5)];
            return Focus(
              onFocusChange: (value) => heroFocused = value,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final small = constraints.maxWidth < 600;
                  return ConstrainedBox(
                    constraints: BoxConstraints(minHeight: small ? 330 : 290),
                    child: Stack(
                      children: [
                        if (item.backdrop != null)
                          Positioned.fill(
                            child: Image.network(
                              'https://image.tmdb.org/t/p/w1280${item.backdrop}',
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const SizedBox(),
                            ),
                          ),
                        const Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xf5101216), Color(0x99101216)],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                            ),
                          ),
                        ),
                        const Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Colors.transparent, Color(0xff101216)],
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                              ),
                            ),
                          ),
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(
                            24,
                            small ? 22 : 36,
                            24,
                            16,
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Chip(
                                label: Text('Film'),
                                visualDensity: VisualDensity.compact,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item.title,
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '⭐ ${item.rating.toStringAsFixed(1)}   ${item.date.length >= 4 ? item.date.substring(0, 4) : ''}',
                              ),
                              const SizedBox(height: 10),
                              Text(
                                item.overview,
                                maxLines: small ? 3 : 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 16),
                              Wrap(
                                spacing: 12,
                                runSpacing: 6,
                                children: [
                                  FilledButton.icon(
                                    onPressed: () => details(item),
                                    icon: const Icon(Icons.info_outline),
                                    label: const Text('Plus d’infos'),
                                  ),
                                  OutlinedButton.icon(
                                    onPressed: () =>
                                        widget.library.toggleFavorite(item),
                                    icon: Icon(
                                      widget.library.favorites.containsKey(
                                            item.key,
                                          )
                                          ? Icons.favorite
                                          : Icons.favorite_outline,
                                    ),
                                    label: Text(
                                      widget.library.favorites.containsKey(
                                            item.key,
                                          )
                                          ? 'Dans les favoris'
                                          : 'Ajouter aux favoris',
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            );
          },
        ),
        if (resume.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Reprendre',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 88,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: resume.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (context, i) {
                      final p = resume[i],
                          item = MediaItem.fromJson(
                            Map<String, dynamic>.from(resume[i]['media']),
                          );
                      return SizedBox(
                        width: 240,
                        child: Card(
                          child: InkWell(
                            onTap: () => details(
                              item,
                              season: p['season'],
                              episode: p['episode'],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const Spacer(),
                                  LinearProgressIndicator(
                                    value:
                                        (p['position'] as num) /
                                        (p['duration'] as num),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        row(
          'Derniers films',
          movies,
          () => all(1, latest: true),
          () => setState(() => movies = widget.api.list('movie', latest: true)),
        ),
        row(
          'Dernières séries',
          series,
          () => all(2, latest: true),
          () => setState(() => series = widget.api.list('tv', latest: true)),
        ),
        row(
          'Animés',
          anime,
          () => all(3),
          () => setState(() => anime = widget.api.list('tv', anime: true)),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget row(
    String title,
    Future<MediaPage> future,
    VoidCallback seeAll,
    VoidCallback retry,
  ) => Padding(
    padding: const EdgeInsets.only(top: 12, bottom: 16),
    child: Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ),
              TextButton(
                onPressed: seeAll,
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Voir tout'),
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
                    const Text('Ce catalogue est momentanément indisponible.'),
                    TextButton(
                      onPressed: retry,
                      child: const Text('Réessayer'),
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
              return const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Aucun titre pour le moment.'),
              );
            }
            final items = snapshot.data!.items;
            final width = widget.tv ? 148.0 : 145.0;
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
                    onTap: () => details(items[i]),
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
