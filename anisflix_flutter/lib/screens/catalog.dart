import 'dart:async';

import 'package:flutter/material.dart';

import '../models/media.dart';
import '../models/watch_provider.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import 'details.dart';
import '../widgets/tv_search_keyboard.dart';

class CatalogScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final int section;
  final bool tv;
  final bool latestOverride;
  final int? initialProvider;
  final String? initialMediaType, filter;
  final String initialQuery;
  final bool showSearchField;
  const CatalogScreen({
    super.key,
    required this.api,
    required this.library,
    required this.section,
    required this.tv,
    this.latestOverride = false,
    this.initialProvider,
    this.initialMediaType,
    this.filter,
    this.initialQuery = '',
    this.showSearchField = true,
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

  Future<void> load({bool reset = false}) async {
    if (loading && !reset) return;
    final ticket = reset ? ++generation : generation;
    if (reset) {
      page = 0;
      pages = 1;
      items = [];
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
      'À découvrir',
      'Films',
      'Séries',
      'Animés',
      'Recherche',
      'Mes favoris',
    ][widget.section];
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
    return CustomScrollView(
      controller: scroll,
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!(widget.section == 4 && widget.tv))
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineMedium
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                const SizedBox(height: 16),
                if (widget.section == 4 && widget.showSearchField) ...[
                  TextField(
                    controller: search,
                    autofocus: !widget.tv,
                    readOnly: widget.tv,
                    onChanged: searchChanged,
                    onSubmitted: (_) => load(reset: true),
                    decoration: InputDecoration(
                      hintText: 'Un film, une série…',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        tooltip: 'Effacer',
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
                if ([1, 2, 3].contains(widget.section))
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (widget.section == 3)
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'tv', label: Text('Séries')),
                            ButtonSegment(value: 'movie', label: Text('Films')),
                          ],
                          selected: {animeType},
                          onSelectionChanged: (v) {
                            animeType = v.first;
                            unawaited(load(reset: true));
                          },
                        ),
                      DropdownButton<int?>(
                        value: provider,
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text('Toutes les plateformes'),
                          ),
                          for (final p in watchProviders)
                            DropdownMenuItem(value: p.id, child: Text(p.name)),
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
                    'Reprendre',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 94,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: resume.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, i) {
                        final p = resume[i];
                        final m = MediaItem.fromJson(
                          Map<String, dynamic>.from(p['media']),
                        );
                        return SizedBox(
                          width: 260,
                          child: Card(
                            child: InkWell(
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
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      m.title,
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
                  const SizedBox(height: 20),
                  Text(
                    'Dernières sorties',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ],
              ],
            ),
          ),
        ),
        if (visible.isEmpty && !loading && error == null)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: Center(child: Text('Aucun titre à afficher.')),
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
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => visible[i].latestEpisode != null
                          ? EpisodeDetailScreen(
                              api: widget.api,
                              library: widget.library,
                              item: visible[i],
                              season: visible[i].latestSeason ?? 1,
                              episode: visible[i].latestEpisode!,
                            )
                          : DetailScreen(
                              api: widget.api,
                              library: widget.library,
                              item: visible[i],
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
                    Text(error!, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => load(reset: items.isEmpty),
                      child: const Text('Réessayer'),
                    ),
                  ],
                  if (loading) const CircularProgressIndicator(),
                  if (!loading &&
                      error == null &&
                      page < pages &&
                      widget.section != 5 &&
                      visible.isNotEmpty)
                    OutlinedButton.icon(
                      onPressed: load,
                      icon: const Icon(Icons.expand_more),
                      label: const Text('Voir plus'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class MediaCard extends StatefulWidget {
  final MediaItem item;
  final VoidCallback onTap;
  const MediaCard({super.key, required this.item, required this.onTap});
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
              child: SizedBox(
                width: double.infinity,
                child: widget.item.posterUrl == null
                    ? const Icon(Icons.movie, size: 48)
                    : Image.network(
                        widget.item.posterUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) =>
                            const Icon(Icons.movie, size: 48),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
              child: Text(
                widget.item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 0, 10, 10),
              child: Text(
                '${widget.item.date.length >= 4 ? widget.item.date.substring(0, 4) : '—'}  ·  ★ ${widget.item.rating.toStringAsFixed(1)}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
