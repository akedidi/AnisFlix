import 'dart:async';

import 'package:flutter/material.dart';

import '../widgets/cached_media_image.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../models/watch_provider.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import 'details.dart';
import '../widgets/tv_search_keyboard.dart';
import '../widgets/resume_card.dart';
import '../widgets/watch_progress_bar.dart';

class CatalogScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final int section;
  final bool tv;
  final bool latestOverride;
  final int? initialProvider;
  final int? initialGenre;
  final String? initialMediaType, filter;
  final String initialQuery;
  final bool showSearchField;
  final bool showHeading;
  final bool showFilters;
  const CatalogScreen({
    super.key,
    required this.api,
    required this.library,
    required this.section,
    required this.tv,
    this.latestOverride = false,
    this.initialProvider,
    this.initialGenre,
    this.initialMediaType,
    this.filter,
    this.initialQuery = '',
    this.showSearchField = true,
    this.showHeading = true,
    this.showFilters = true,
  });
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final search = TextEditingController();
  final scroll = ScrollController();
  Timer? debounce;
  List<MediaItem> items = [];
  bool loading = false;
  bool paginationScheduled = false;
  String? error;
  int page = 0, pages = 1, generation = 0;
  int? provider;
  String animeType = 'tv';
  String get type => widget.section == 2
      ? 'tv'
      : widget.section == 3
      ? animeType
      : 'movie';
  @override
  void initState() {
    super.initState();
    provider = widget.initialProvider;
    search.text = widget.initialQuery;
    animeType = widget.initialMediaType ?? 'tv';
    scroll.addListener(scheduleNextPage);
    if (widget.section != 5 &&
        (widget.section != 4 || search.text.trim().isNotEmpty)) {
      unawaited(load(reset: true));
    }
  }

  @override
  void dispose() {
    debounce?.cancel();
    search.dispose();
    scroll.dispose();
    super.dispose();
  }

  void scheduleNextPage() {
    if (paginationScheduled) return;
    paginationScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      paginationScheduled = false;
      if (!mounted ||
          loading ||
          error != null ||
          widget.section == 5 ||
          items.isEmpty ||
          page >= pages ||
          !scroll.hasClients ||
          !scroll.position.hasContentDimensions) {
        return;
      }
      if (scroll.position.extentAfter <= 240) unawaited(load());
    });
  }

  Future<void> load({bool reset = false}) async {
    if (!reset && (loading || page >= pages)) return;
    final ticket = reset ? ++generation : generation;
    if (reset) {
      page = 0;
      pages = 1;
      items = [];
      if (scroll.hasClients) scroll.jumpTo(0);
    }
    if (widget.section == 4 && search.text.trim().isEmpty) {
      setState(() {
        loading = false;
        error = null;
      });
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await widget.api.list(
        type,
        page: page + 1,
        query: widget.section == 4 ? search.text.trim() : '',
        latest: widget.section == 0 || widget.latestOverride,
        anime: widget.section == 3,
        provider: provider,
        genre: widget.initialGenre,
        filter: widget.filter,
      );
      if (!mounted || ticket != generation) return;
      setState(() {
        final seen = items.map((x) => x.key).toSet();
        items.addAll(result.items.where((x) => seen.add(x.key)));
        page = result.page;
        pages = result.totalPages;
        loading = false;
      });
      scheduleNextPage();
    } catch (e) {
      if (mounted && ticket == generation) {
        setState(() {
          error = e is ApiFailure
              ? e.message
              : 'Connexion impossible. Réessaie.';
          loading = false;
        });
      }
    }
  }

  void searchChanged(String _) {
    debounce?.cancel();
    generation++;
    setState(() {
      items = [];
      error = null;
      loading = search.text.trim().isNotEmpty;
    });
    debounce = Timer(
      const Duration(milliseconds: 450),
      () => load(reset: true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = widget.section == 5
        ? widget.library.favorites.values.toList()
        : items;
    final title = [
      context.tr("À découvrir"),
      context.tr("Films"),
      context.tr("Séries"),
      context.tr("Animés"),
      context.tr("Recherche"),
      context.tr("Mes favoris"),
    ][widget.section];
    final showHeading =
        widget.showHeading && !(widget.section == 4 && widget.tv);
    final showFilters =
        widget.showFilters && [1, 2, 3].contains(widget.section);
    final resume =
        widget.library.progress.values
            .where(
              (p) =>
                  (p['position'] as num) > 30 &&
                  (p['position'] as num) < (p['duration'] as num) * .95,
            )
            .toList()
          ..sort(
            (a, b) =>
                (b['updated'] as String).compareTo(a['updated'] as String),
          );
    return NotificationListener<ScrollMetricsNotification>(
      onNotification: (_) {
        scheduleNextPage();
        return false;
      },
      child: CustomScrollView(
        controller: scroll,
        slivers: [
          if (showHeading ||
              (widget.section == 4 && widget.showSearchField) ||
              showFilters ||
              (widget.section == 0 && resume.isNotEmpty))
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (showHeading) ...[
                      Text(
                        title,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (widget.section == 4 && widget.showSearchField) ...[
                      TextField(
                        controller: search,
                        autofocus: !widget.tv,
                        readOnly: widget.tv,
                        onChanged: searchChanged,
                        onSubmitted: (_) => load(reset: true),
                        decoration: InputDecoration(
                          hintText: context.tr("Un film, une série…"),
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: IconButton(
                            tooltip: context.tr("Effacer"),
                            onPressed: () {
                              search.clear();
                              searchChanged('');
                            },
                            icon: const Icon(Icons.clear),
                          ),
                        ),
                      ),
                      if (widget.tv)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: TvSearchKeyboard(
                            controller: search,
                            onChanged: searchChanged,
                            onSubmitted: () => load(reset: true),
                          ),
                        ),
                    ],
                    if (showFilters)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (widget.section == 3)
                            SegmentedButton<String>(
                              segments: [
                                ButtonSegment(
                                  value: 'tv',
                                  label: Text(context.tr("Séries")),
                                ),
                                ButtonSegment(
                                  value: 'movie',
                                  label: Text(context.tr("Films")),
                                ),
                              ],
                              selected: {animeType},
                              onSelectionChanged: (v) {
                                animeType = v.first;
                                unawaited(load(reset: true));
                              },
                            ),
                          if (widget.section != 3)
                            DropdownButton<int?>(
                              value: provider,
                              items: [
                                DropdownMenuItem(
                                  value: null,
                                  child: Text(
                                    context.tr("Toutes les plateformes"),
                                  ),
                                ),
                                for (final p in watchProviders)
                                  DropdownMenuItem(
                                    value: p.id,
                                    child: Text(p.name),
                                  ),
                              ],
                              onChanged: (v) {
                                provider = v;
                                unawaited(load(reset: true));
                              },
                            ),
                        ],
                      ),
                    if (widget.section == 0 && resume.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        context.tr("Reprendre"),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 116,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: resume.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 10),
                          itemBuilder: (context, i) {
                            final p = resume[i];
                            final m = MediaItem.fromJson(
                              Map<String, dynamic>.from(p['media']),
                            );
                            return ResumeCard(
                              item: m,
                              progress:
                                  (p['position'] as num) /
                                  (p['duration'] as num),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => DetailScreen(
                                    api: widget.api,
                                    library: widget.library,
                                    item: m,
                                    initialSeason: p['season'],
                                    initialEpisode: p['episode'],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        context.tr("Dernières sorties"),
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          if (visible.isEmpty && !loading && error == null)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: Text(context.tr("Aucun titre à afficher."))),
            ),
          SliverPadding(
            padding: const EdgeInsets.all(24),
            sliver: SliverLayoutBuilder(
              builder: (context, constraints) {
                final columns =
                    (constraints.crossAxisExtent / (widget.tv ? 190 : 160))
                        .floor()
                        .clamp(1, 9);
                return SliverGrid.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: columns,
                    childAspectRatio: .57,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 20,
                  ),
                  itemCount: visible.length,
                  itemBuilder: (context, i) => MediaCard(
                    item: visible[i],
                    library: widget.library,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DetailScreen(
                          api: widget.api,
                          library: widget.library,
                          item: visible[i],
                          initialSeason: visible[i].latestSeason,
                          initialEpisode: visible[i].latestEpisode,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 36),
              child: Center(
                child: Column(
                  children: [
                    if (error != null) ...[
                      Text(
                        context.l10n.message(error!),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => load(reset: items.isEmpty),
                        child: Text(context.tr("Réessayer")),
                      ),
                    ],
                    if (loading) const CircularProgressIndicator(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MediaCard extends StatefulWidget {
  final MediaItem item;
  final Library library;
  final VoidCallback onTap;
  const MediaCard({
    super.key,
    required this.item,
    required this.library,
    required this.onTap,
  });
  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  bool focused = false;
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 120),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(14),
      border: Border.all(
        color: focused
            ? Theme.of(context).colorScheme.primary
            : Colors.transparent,
        width: 3,
      ),
    ),
    child: Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: widget.onTap,
        onFocusChange: (v) {
          setState(() => focused = v);
          if (v) {
            Scrollable.ensureVisible(
              context,
              duration: const Duration(milliseconds: 180),
              alignment: .4,
            );
          }
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  widget.item.posterUrl == null
                      ? const Icon(Icons.movie, size: 48)
                      : CachedMediaImage(
                          widget.item.posterUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              const Icon(Icons.movie, size: 48),
                        ),
                  if ((
                        widget.item.type,
                        widget.item.latestSeason,
                        widget.item.latestEpisode,
                      )
                      case ('tv', final int season, final int episode)
                      when season >= 0 && episode > 0)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xffed214d),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'S$season-E$episode',
                          semanticsLabel: context.tr(
                            'Saison {0} · Épisode {1}',
                            ['$season', '$episode'],
                          ),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: WatchProgressBar(
                      library: widget.library,
                      item: widget.item,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
              child: Text(
                context.l10n.mediaTitle(widget.item.title),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Text(
                '${widget.item.date.length >= 4 ? widget.item.date.substring(0, 4) : '—'}  ·  ★ ${context.l10n.decimal(widget.item.rating)}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
