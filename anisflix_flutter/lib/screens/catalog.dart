import 'dart:async';

import 'package:flutter/material.dart';

import '../widgets/cached_media_image.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../models/watch_provider.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import '../services/platform_bridge.dart';
import 'details.dart';
import '../widgets/tv_search_keyboard.dart';
import '../widgets/resume_card.dart';
import '../widgets/watch_progress_bar.dart';
import '../widgets/catalog_refresh.dart';

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
  final firstSearchResult = FocusNode();
  Timer? debounce;
  List<MediaItem> items = [];
  bool loading = false;
  bool paginationScheduled = false;
  String? error;
  int page = 0, pages = 1, generation = 0;
  int? provider;
  String animeType = 'tv';
  String favoriteType = 'movie';
  bool tvKeyboardOpen = true;
  bool focusSearchResults = false;
  bool get showSuggestions =>
      widget.section == 4 && widget.tv && search.text.trim().isEmpty;
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
        (widget.section != 4 ||
            showSuggestions ||
            search.text.trim().isNotEmpty)) {
      unawaited(load(reset: true));
    }
  }

  @override
  void dispose() {
    debounce?.cancel();
    search.dispose();
    scroll.dispose();
    firstSearchResult.dispose();
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

  Future<void> load({bool reset = false, bool keepItems = false}) async {
    if (!reset && (loading || page >= pages)) return;
    final ticket = reset ? ++generation : generation;
    if (reset) {
      page = 0;
      pages = 1;
      if (!keepItems) {
        items = [];
        if (scroll.hasClients) scroll.jumpTo(0);
      }
    }
    if (widget.section == 4 && !showSuggestions && search.text.trim().isEmpty) {
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
      final result = showSuggestions
          ? await loadSuggestions()
          : await widget.api.list(
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
        if (reset) items = [];
        final seen = items.map((x) => x.key).toSet();
        items.addAll(result.items.where((x) => seen.add(x.key)));
        page = result.page;
        pages = result.totalPages;
        loading = false;
      });
      if (reset && focusSearchResults && items.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted &&
              ticket == generation &&
              focusSearchResults &&
              firstSearchResult.context != null) {
            firstSearchResult.requestFocus();
          }
        });
      }
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

  Future<MediaPage> loadSuggestions() async {
    final [movies, series] = await Future.wait([
      widget.api.list('movie'),
      widget.api.list('tv'),
    ]);
    return MediaPage(
      [
        for (var index = 0; index < 10; index++) ...[
          if (index < movies.items.length) movies.items[index],
          if (index < series.items.length) series.items[index],
        ],
      ],
      1,
      1,
    );
  }

  void searchChanged(String _) {
    debounce?.cancel();
    if (showSuggestions) {
      unawaited(load(reset: true));
      return;
    }
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

  void submitTvSearch() {
    if (search.text.trim().isEmpty) return;
    debounce?.cancel();
    setState(() {
      tvKeyboardOpen = false;
      focusSearchResults = true;
    });
    unawaited(load(reset: true));
  }

  @override
  Widget build(BuildContext context) {
    final androidLayout = widget.tv || PlatformBridge.android;
    final favorites = widget.section == 5 && androidLayout;
    final visible = widget.section == 5
        ? widget.library.favorites.values
              .where((item) => !favorites || item.type == favoriteType)
              .toList()
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
    final slivers = <Widget>[
      if (showHeading ||
          (widget.section == 4 && widget.showSearchField) ||
          showFilters ||
          favorites ||
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
                    onTap: widget.tv && !tvKeyboardOpen
                        ? () => setState(() {
                            tvKeyboardOpen = true;
                            focusSearchResults = false;
                          })
                        : null,
                    onChanged: searchChanged,
                    onSubmitted: (_) => load(reset: true),
                    decoration: InputDecoration(
                      hintText: context.tr("Un film, une série…"),
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        tooltip: context.tr("Effacer"),
                        onPressed: () {
                          search.clear();
                          if (widget.tv) {
                            tvKeyboardOpen = true;
                            focusSearchResults = false;
                          }
                          searchChanged('');
                        },
                        icon: const Icon(Icons.clear),
                      ),
                    ),
                  ),
                  if (widget.tv && tvKeyboardOpen)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: TvSearchKeyboard(
                        controller: search,
                        onChanged: searchChanged,
                        onSubmitted: submitTvSearch,
                      ),
                    ),
                ],
                if (favorites)
                  SizedBox(
                    width: double.infinity,
                    child: SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                          value: 'movie',
                          label: Text(context.tr('Films')),
                        ),
                        ButtonSegment(
                          value: 'tv',
                          label: Text(context.tr('Séries')),
                        ),
                      ],
                      selected: {favoriteType},
                      onSelectionChanged: (value) =>
                          setState(() => favoriteType = value.single),
                    ),
                  ),
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
                              child: Text(context.tr("Toutes les plateformes")),
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
                              (p['position'] as num) / (p['duration'] as num),
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
      if (showSuggestions && (visible.isNotEmpty || loading))
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          sliver: SliverToBoxAdapter(
            child: Text(
              context.tr("Suggestions"),
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
        ),
      if (visible.isEmpty && !loading && error == null)
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
            child: Text(
              context.tr(
                favorites
                    ? 'Aucun favori pour le moment.'
                    : 'Aucun titre à afficher.',
              ),
            ),
          ),
        ),
      SliverPadding(
        padding: EdgeInsets.all(PlatformBridge.android && !widget.tv ? 16 : 24),
        sliver: SliverLayoutBuilder(
          builder: (context, constraints) {
            final spacing = androidLayout ? 10.0 : 16.0;
            final available = constraints.crossAxisExtent;
            final useCategorySize =
                !androidLayout && (widget.section == 3 || showSuggestions);
            final cardWidth = MediaCard.categoryWidth(tv: widget.tv)
                .clamp(0.0, available);
            final columns = useCategorySize
                ? ((available + spacing) / (cardWidth + spacing)).floor().clamp(
                    1,
                    9,
                  )
                : widget.tv
                ? (available / 120).floor().clamp(1, 7)
                : (available / (androidLayout ? 112 : 160)).floor().clamp(1, 9);
            final grid = SliverGrid.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisExtent: MediaCard.heightForWidth(
                  useCategorySize
                      ? cardWidth
                      : (available - (columns - 1) * spacing) / columns,
                  compact: androidLayout,
                  textScaler: MediaQuery.textScalerOf(context),
                ),
                crossAxisSpacing: spacing,
                mainAxisSpacing: 20,
              ),
              itemCount: visible.length,
              itemBuilder: (context, i) => MediaCard(
                item: visible[i],
                library: widget.library,
                compact: androidLayout,
                focusNode: i == 0 && focusSearchResults
                    ? firstSearchResult
                    : null,
                autofocus:
                    i == 0 &&
                    widget.tv &&
                    !widget.showFilters &&
                    widget.section != 4,
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
            if (!useCategorySize) return grid;
            final gridWidth = columns * cardWidth + (columns - 1) * spacing;
            return SliverPadding(
              padding: EdgeInsetsDirectional.only(
                end: (available - gridWidth).clamp(0.0, available),
              ),
              sliver: grid,
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
                    onPressed: () => load(
                      reset: items.isEmpty || page == 0,
                      keepItems: items.isNotEmpty,
                    ),
                    child: Text(context.tr("Réessayer")),
                  ),
                ],
                if (loading) const CircularProgressIndicator(),
              ],
            ),
          ),
        ),
      ),
    ];
    return NotificationListener<ScrollMetricsNotification>(
      onNotification: (_) {
        scheduleNextPage();
        return false;
      },
      child: [0, 1, 2, 3].contains(widget.section)
          ? CatalogRefresh(
              onRefresh: () => load(reset: true, keepItems: true),
              controller: scroll,
              showButton: widget.tv || !PlatformBridge.android,
              slivers: slivers,
            )
          : CustomScrollView(
              controller: scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: slivers,
            ),
    );
  }
}

class MediaCard extends StatefulWidget {
  static const posterAspectRatio = 2 / 3;
  static const _borderWidth = 3.0;

  static double _informationHeight({
    required bool compact,
    required TextScaler textScaler,
  }) {
    final scaler = textScaler.clamp(maxScaleFactor: 1.3);
    return (compact ? 5 : 8) +
        (scaler.scale(compact ? 13 : 14) * 1.2 * 2).ceilToDouble() +
        3 +
        (scaler.scale(compact ? 11 : 12) * 1.2).ceilToDouble() +
        (compact ? 6 : 8);
  }

  static double heightForWidth(
    double width, {
    required bool compact,
    required TextScaler textScaler,
  }) =>
      (width - 2 * _borderWidth).clamp(0, double.infinity) / posterAspectRatio +
      _informationHeight(compact: compact, textScaler: textScaler) +
      2 * _borderWidth;

  static double categoryWidth({required bool tv}) => tv
      ? 136
      : PlatformBridge.android
      ? 120
      : 145;

  final MediaItem item;
  final Library library;
  final VoidCallback onTap;
  final bool compact, autofocus;
  final FocusNode? focusNode;
  const MediaCard({
    super.key,
    required this.item,
    required this.library,
    required this.onTap,
    this.compact = false,
    this.autofocus = false,
    this.focusNode,
  });
  @override
  State<MediaCard> createState() => _MediaCardState();
}

class _MediaCardState extends State<MediaCard> {
  bool focused = false;
  @override
  Widget build(BuildContext context) => MediaQuery.withClampedTextScaling(
    maxScaleFactor: 1.3,
    child: Builder(
      builder: (context) => AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: focused
                ? Theme.of(context).colorScheme.primary
                : Colors.transparent,
            width: MediaCard._borderWidth,
          ),
        ),
        child: Card(
          margin: EdgeInsets.zero,
          child: InkWell(
            autofocus: widget.autofocus,
            focusNode: widget.focusNode,
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
                  child: Center(
                    child: AspectRatio(
                      key: const ValueKey('media-card-poster'),
                      aspectRatio: MediaCard.posterAspectRatio,
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
                  ),
                ),
                SizedBox(
                  height: MediaCard._informationHeight(
                    compact: widget.compact,
                    textScaler: MediaQuery.textScalerOf(context),
                  ),
                  child: Padding(
                    padding: widget.compact
                        ? const EdgeInsets.fromLTRB(6, 5, 6, 6)
                        : const EdgeInsets.fromLTRB(8, 8, 8, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height:
                              (MediaQuery.textScalerOf(context)
                                          .scale(widget.compact ? 13 : 14) *
                                      1.2 *
                                      2)
                                  .ceilToDouble(),
                          child: Text(
                            context.l10n.mediaTitle(widget.item.title),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: widget.compact ? 13 : 14,
                              height: 1.2,
                            ),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          widget.compact
                              ? [
                                  if (widget.item.rating > 0)
                                    '★ ${context.l10n.decimal(widget.item.rating)}',
                                  if (widget.item.date.length >= 4)
                                    widget.item.date.substring(0, 4),
                                ].join('  ·  ')
                              : '${widget.item.date.length >= 4 ? widget.item.date.substring(0, 4) : '—'}  ·  ★ ${context.l10n.decimal(widget.item.rating)}',
                          maxLines: 1,
                          softWrap: false,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                fontSize: widget.compact ? 11 : 12,
                                height: 1.2,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}
