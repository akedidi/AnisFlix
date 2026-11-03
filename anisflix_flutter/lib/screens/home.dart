import 'dart:async';

import 'package:flutter/material.dart';

import '../widgets/cached_media_image.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import 'catalog.dart';
import 'details.dart';
import '../widgets/media_category_row.dart';
import '../widgets/resume_card.dart';
import '../widgets/watch_progress_bar.dart';

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
      builder: (_) => DetailScreen(
        api: widget.api,
        library: widget.library,
        item: item,
        initialSeason: season ?? item.latestSeason,
        initialEpisode: episode ?? item.latestEpisode,
      ),
    ),
  );
  void all(HomeCategory section) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => Scaffold(
        appBar: AppBar(title: Text(context.tr(section.title))),
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
          showHeading: false,
          showFilters: false,
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
                            child: CachedMediaImage(
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
                              Chip(
                                label: Text(context.tr("Film")),
                                visualDensity: VisualDensity.compact,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                context.l10n.mediaTitle(item.title),
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineMedium
                                    ?.copyWith(fontWeight: FontWeight.w800),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '⭐ ${context.l10n.decimal(item.rating)}   ${item.date.length >= 4 ? item.date.substring(0, 4) : ''}',
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
                                    label: Text(context.tr("Plus d’infos")),
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
                                          ? context.tr("Dans les favoris")
                                          : context.tr("Ajouter aux favoris"),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Positioned(
                          left: 24,
                          right: 24,
                          bottom: 0,
                          child: WatchProgressBar(
                            key: const ValueKey('home-hero-progress'),
                            library: widget.library,
                            item: item,
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
                  context.tr("Reprendre"),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 116,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: resume.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 10),
                    itemBuilder: (context, i) {
                      final p = resume[i],
                          item = MediaItem.fromJson(
                            Map<String, dynamic>.from(resume[i]['media']),
                          );
                      return ResumeCard(
                        item: item,
                        progress:
                            (p['position'] as num) / (p['duration'] as num),
                        onTap: () => details(
                          item,
                          season: p['season'],
                          episode: p['episode'],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        for (final section in homeCategories)
          MediaCategoryRow(
            title: section.title,
            library: widget.library,
            future: sections[section.title]!,
            tv: widget.tv,
            onSelected: details,
            seeAll: () => all(section),
            retry: () => setState(() {
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
