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
  late Future<MediaPage> movies;
  final sections = <String, Future<MediaPage>>{};
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
    for (final section in homeCategories) {
      sections[section.title] = fetch(section);
    }
    movies = sections[homeCategories.first.title]!;
    // Each row owns its error UI. Attach a handler immediately, before it scrolls into view.
    for (final future in sections.values) {
      unawaited(
        future.then<void>((_) {}, onError: (Object _, StackTrace _) {}),
      );
    }
  }

  Future<MediaPage> fetch(HomeCategory section, {int page = 1}) =>
      widget.api.list(
        section.type,
        page: page,
        latest: section.latest,
        anime: section.anime,
        filter: section.filter,
      );
  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  void details(MediaItem item, {int? season, int? episode}) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => item.latestEpisode != null
          ? EpisodeDetailScreen(
              api: widget.api,
              library: widget.library,
              item: item,
              season: item.latestSeason ?? 1,
              episode: item.latestEpisode!,
            )
          : DetailScreen(
              api: widget.api,
              library: widget.library,
              item: item,
              initialSeason: season,
              initialEpisode: episode,
            ),
    ),
  );
  void all(HomeCategory section) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: Text(section.title)),
        body: CatalogScreen(
          api: widget.api,
          library: widget.library,
          section: section.anime
              ? 3
              : section.type == 'tv'
              ? 2
              : 1,
          tv: widget.tv,
          latestOverride: section.latest,
          initialMediaType: section.type,
          filter: section.filter,
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
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  Theme.of(context).scaffoldBackgroundColor
                                      .withValues(alpha: .96),
                                  Theme.of(context).scaffoldBackgroundColor
                                      .withValues(alpha: .45),
                                ],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                            ),
                          ),
                        ),
                        Positioned.fill(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  Colors.transparent,
                                  Theme.of(context).scaffoldBackgroundColor,
                                ],
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
        for (final section in homeCategories)
          row(
            section.title,
            sections[section.title]!,
            () => all(section),
            () => setState(() {
              sections[section.title] = fetch(section);
              if (section == homeCategories.first) {
                movies = sections[section.title]!;
              }
            }),
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

class HomeCategory {
  final String title, type;
  final bool latest, anime;
  final String? filter;
  const HomeCategory(
    this.title,
    this.type, {
    this.latest = false,
    this.anime = false,
    this.filter,
  });
}

const homeCategories = [
  HomeCategory('Derniers films', 'movie', latest: true),
  HomeCategory('Derniers épisodes', 'tv', filter: 'last-episodes'),
  HomeCategory('Dernières séries', 'tv', latest: true),
  HomeCategory('Films Populaires', 'movie'),
  HomeCategory('Séries Populaires', 'tv'),
  HomeCategory('Anime - Derniers Films', 'movie', latest: true, anime: true),
  HomeCategory('Anime - Dernières Séries', 'tv', latest: true, anime: true),
  HomeCategory('Anime - Films Populaires', 'movie', anime: true),
  HomeCategory('Anime - Séries Populaires', 'tv', anime: true),
];
