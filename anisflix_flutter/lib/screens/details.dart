import 'dart:async';

import 'package:flutter/material.dart';

import '../widgets/cached_media_image.dart';

import 'package:url_launcher/url_launcher.dart';

import '../l10n/app_localizations.dart';
import '../models/media.dart';
import '../services/catalog_api.dart';
import '../services/downloads.dart';
import '../services/library.dart';
import '../services/source_list_policy.dart';
import '../widgets/watch_progress_bar.dart';
import 'catalog.dart';
import 'player.dart';

class DetailScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final MediaItem item;
  final int? initialSeason, initialEpisode;
  const DetailScreen({
    super.key,
    required this.api,
    required this.library,
    required this.item,
    this.initialSeason,
    this.initialEpisode,
  });
  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  late Future<Map<String, dynamic>> details;
  Future<Map<String, dynamic>>? episodes;
  int? season, selectedEpisode;
  final mobileSourcesKey = GlobalKey();
  @override
  void initState() {
    super.initState();
    details = loadDetails();
  }

  Future<Map<String, dynamic>> loadDetails() async {
    final result = await widget.api.details(widget.item);
    final seasons = (result['seasons'] as List? ?? [])
        .whereType<Map>()
        .toList();
    if (mounted && seasons.isNotEmpty && season == null) {
      final available = seasons
          .map((s) => (s['season_number'] as num).toInt())
          .toList();
      chooseSeason(
        available.contains(widget.initialSeason)
            ? widget.initialSeason!
            : available.firstWhere((s) => s > 0, orElse: () => available.first),
        initialEpisode:
            widget.initialSeason == null ||
                available.contains(widget.initialSeason)
            ? widget.initialEpisode
            : null,
      );
    }
    return result;
  }

  void chooseSeason(int value, {int? initialEpisode}) => setState(() {
    season = value;
    selectedEpisode = initialEpisode;
    episodes = widget.api.season(widget.item.id, value);
  });
  void selectEpisode(int number) {
    setState(() => selectedEpisode = number);
    if (MediaQuery.sizeOf(context).width < 850) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final target = mobileSourcesKey.currentContext;
        if (mounted && target != null) {
          Scrollable.ensureVisible(
            target,
            alignment: .1,
            duration: const Duration(milliseconds: 180),
          );
        }
      });
    }
  }

  Widget episodeSources() => SourcesPanel(
    key: ValueKey(
      'episode-sources-${widget.item.key}-$season-$selectedEpisode',
    ),
    api: widget.api,
    library: widget.library,
    item: widget.item,
    season: season,
    episode: selectedEpisode,
  );
  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
    future: details,
    builder: (context, snapshot) {
      final data = snapshot.data ?? <String, dynamic>{};
      final wide = MediaQuery.sizeOf(context).width >= 850;
      return MediaDetailLayout(
        item: widget.item,
        information: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MediaInformation(
              item: widget.item,
              library: widget.library,
              metadata: data,
            ),
            if (snapshot.hasError)
              TextButton(
                onPressed: () => setState(() => details = loadDetails()),
                child: Text(context.tr("Réessayer de charger la fiche")),
              ),
            if (widget.item.type == 'tv') ...[
              const SizedBox(height: 24),
              Text(
                context.tr("Saisons et épisodes"),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              if (!snapshot.hasData && !snapshot.hasError)
                const LinearProgressIndicator(),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s
                      in (data['seasons'] as List? ?? []).whereType<Map>())
                    ChoiceChip(
                      selected: season == s['season_number'],
                      label: Text(
                        s['name'] ??
                            context.tr("Saison {0}", [s['season_number']]),
                      ),
                      onSelected: (_) =>
                          chooseSeason((s['season_number'] as num).toInt()),
                    ),
                ],
              ),
              if (!wide && selectedEpisode == null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    context.tr(
                      "Sélectionne un épisode pour afficher ses sources.",
                    ),
                  ),
                ),
              if (episodes != null)
                FutureBuilder<Map<String, dynamic>>(
                  future: episodes,
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return TextButton(
                        onPressed: () => chooseSeason(season!),
                        child: Text(context.tr("Réessayer les épisodes")),
                      );
                    }
                    if (snapshot.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.all(24),
                        child: LinearProgressIndicator(),
                      );
                    }
                    return Column(
                      children: [
                        for (final ep
                            in (snapshot.data!['episodes'] as List? ?? [])
                                .whereType<Map>())
                          _EpisodeCard(
                            key: ValueKey(
                              'episode-card-$season-${ep['episode_number']}',
                            ),
                            item: widget.item,
                            library: widget.library,
                            metadata: ep,
                            season: season!,
                            selected: selectedEpisode == ep['episode_number'],
                            autofocus:
                                season == widget.initialSeason &&
                                ep['episode_number'] == widget.initialEpisode,
                            onSelected: () => selectEpisode(
                              (ep['episode_number'] as num).toInt(),
                            ),
                            sources:
                                !wide && selectedEpisode == ep['episode_number']
                                ? Padding(
                                    key: mobileSourcesKey,
                                    padding: const EdgeInsets.all(16),
                                    child: episodeSources(),
                                  )
                                : null,
                          ),
                      ],
                    );
                  },
                ),
            ],
            _RelatedMedia(
              api: widget.api,
              library: widget.library,
              data: data,
              type: widget.item.type,
            ),
          ],
        ),
        sources: widget.item.type == 'movie'
            ? SourcesPanel(
                api: widget.api,
                library: widget.library,
                item: widget.item,
              )
            : !wide
            ? null
            : selectedEpisode != null
            ? episodeSources()
            : Padding(
                padding: EdgeInsets.symmetric(vertical: 36),
                child: Text(
                  context.tr(
                    "Sélectionne un épisode pour afficher ses sources.",
                  ),
                ),
              ),
      );
    },
  );
}

class _EpisodeCard extends StatelessWidget {
  final MediaItem item;
  final Library library;
  final Map metadata;
  final int season;
  final bool selected, autofocus;
  final VoidCallback onSelected;
  final Widget? sources;

  const _EpisodeCard({
    super.key,
    required this.item,
    required this.library,
    required this.metadata,
    required this.season,
    required this.selected,
    required this.autofocus,
    required this.onSelected,
    this.sources,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final number = (metadata['episode_number'] as num).toInt();
    final still = metadata['still_path'] as String?;
    final overview = '${metadata['overview'] ?? ''}'.trim();
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? colors.primary : Colors.transparent,
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            selected: selected,
            child: InkWell(
              autofocus: autofocus,
              onTap: onSelected,
              onFocusChange: (focused) {
                if (focused) {
                  Scrollable.ensureVisible(
                    context,
                    alignment: .2,
                    duration: const Duration(milliseconds: 180),
                  );
                }
              },
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            key: ValueKey('episode-thumbnail-$season-$number'),
                            width: 112,
                            height: 63,
                            child: ColoredBox(
                              color: colors.surfaceContainerHighest,
                              child: still == null || still.isEmpty
                                  ? const Icon(Icons.movie_outlined)
                                  : CachedMediaImage(
                                      'https://image.tmdb.org/t/p/w300$still',
                                      fit: BoxFit.cover,
                                      excludeFromSemantics: true,
                                      errorBuilder: (_, _, _) =>
                                          const Icon(Icons.movie_outlined),
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            '$number. ${metadata['name'] ?? context.tr("Épisode")}',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          selected
                              ? Icons.play_circle_fill
                              : Icons.play_circle_outline,
                          color: selected ? colors.primary : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      overview.isEmpty
                          ? context.tr("Aucun résumé disponible.")
                          : overview,
                    ),
                    WatchProgressBar(
                      library: library,
                      item: item,
                      season: season,
                      episode: number,
                      padding: const EdgeInsets.only(top: 12),
                    ),
                  ],
                ),
              ),
            ),
          ),
          ?sources,
        ],
      ),
    );
  }
}

/// Matches the TV detail: full backdrop, information left, sources right.
class MediaDetailLayout extends StatelessWidget {
  final MediaItem item;
  final Widget information;
  final Widget? sources;
  const MediaDetailLayout({
    super.key,
    required this.item,
    required this.information,
    required this.sources,
  });
  @override
  Widget build(BuildContext context) {
    final background = Theme.of(context).scaffoldBackgroundColor;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Stack(
        children: [
          if (item.backdrop != null)
            Positioned.fill(
              child: CachedMediaImage(
                'https://image.tmdb.org/t/p/w1280${item.backdrop}',
                fit: BoxFit.cover,
                alignment: Alignment.topRight,
                errorBuilder: (_, _, _) => const SizedBox(),
              ),
            ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    background.withValues(alpha: .99),
                    background.withValues(alpha: dark ? .82 : .9),
                    background.withValues(alpha: dark ? .55 : .82),
                  ],
                  stops: const [0, .52, 1],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [background.withValues(alpha: .12), background],
                  stops: const [.65, 1],
                ),
              ),
            ),
          ),
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 850;
                final info = Padding(
                  padding: const EdgeInsets.fromLTRB(28, 20, 28, 28),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      IconButton(
                        tooltip: context.tr("Retour"),
                        onPressed: () => Navigator.maybePop(context),
                        icon: const Icon(Icons.arrow_back),
                      ),
                      const SizedBox(height: 12),
                      information,
                    ],
                  ),
                );
                if (!wide) {
                  return ListView(
                    children: [
                      info,
                      if (sources != null)
                        Padding(
                          padding: const EdgeInsets.all(24),
                          child: sources!,
                        ),
                    ],
                  );
                }
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      flex: 64,
                      child: SingleChildScrollView(
                        key: const ValueKey('detail-information'),
                        child: info,
                      ),
                    ),
                    Expanded(
                      flex: 36,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(18, 28, 28, 28),
                        child: sources is SourcesPanel
                            ? sources
                            : SingleChildScrollView(child: sources),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class MediaInformation extends StatelessWidget {
  final MediaItem item;
  final Library library;
  final Map<String, dynamic> metadata;
  const MediaInformation({
    super.key,
    required this.item,
    required this.library,
    this.metadata = const {},
  });
  @override
  Widget build(BuildContext context) {
    final videos = (metadata['videos']?['results'] as List? ?? [])
        .whereType<Map>();
    final trailer = videos
        .where((v) => v['site'] == 'YouTube' && v['type'] == 'Trailer')
        .firstOrNull;
    final regions = metadata['watch/providers']?['results'];
    final country = (metadata['origin_country'] as List? ?? []).firstOrNull;
    final providers = regions is Map
        ? (regions['FR'] ?? regions[country] ?? regions['US'])
        : null;
    final platforms = <Map>[];
    final seen = <dynamic>{};
    if (providers is Map) {
      for (final category in ['flatrate', 'rent', 'buy']) {
        for (final p in (providers[category] as List? ?? []).whereType<Map>()) {
          if (seen.add(p['provider_id'])) platforms.add(p);
        }
      }
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.mediaTitle(item.title),
          style: Theme.of(context).textTheme.headlineLarge
              ?.copyWith(fontSize: 32, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 18),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              (metadata['air_date'] ?? item.date).toString().split('-').first,
            ),
            Text(
              '★ ${context.l10n.decimal(item.rating)}',
              style: const TextStyle(color: Color(0xffffbc00)),
            ),
            if (metadata['runtime'] is num) Text('${metadata['runtime']} min'),
            for (final g
                in (metadata['genres'] as List? ?? []).whereType<Map>())
              Text('${g['name']}'),
            for (final c in (metadata['origin_country'] as List? ?? []))
              Text('$c'),
          ],
        ),
        const SizedBox(height: 22),
        Text(
          '${metadata['overview'] ?? item.overview}'.isEmpty
              ? context.tr("Aucun résumé disponible.")
              : '${metadata['overview'] ?? item.overview}',
          style: Theme.of(context).textTheme.bodyLarge
              ?.copyWith(fontSize: 14, height: 1.43),
        ),
        const SizedBox(height: 26),
        Wrap(
          spacing: 12,
          runSpacing: 10,
          children: [
            if (trailer != null)
              OutlinedButton.icon(
                onPressed: () => launchUrl(
                  Uri.https('www.youtube.com', '/watch', {
                    'v': '${trailer['key']}',
                  }),
                  mode: LaunchMode.externalApplication,
                ),
                icon: const Icon(Icons.ondemand_video),
                label: Text(context.tr("Bande-annonce")),
              ),
            AnimatedBuilder(
              animation: library,
              builder: (_, _) {
                final favorite = library.favorites.containsKey(item.key);
                return OutlinedButton.icon(
                  onPressed: () => library.toggleFavorite(item),
                  icon: Icon(
                    favorite ? Icons.favorite : Icons.favorite_outline,
                  ),
                  label: Text(
                    favorite
                        ? context.tr("Dans les favoris")
                        : context.tr("Ajouter aux favoris"),
                  ),
                );
              },
            ),
          ],
        ),
        if (platforms.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text(
            context.tr("Disponible sur"),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final p in platforms)
                Tooltip(
                  message: '${p['provider_name']}',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedMediaImage(
                      'https://image.tmdb.org/t/p/w92${p['logo_path']}',
                      width: 62,
                      height: 62,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _RelatedMedia extends StatelessWidget {
  final CatalogApi api;
  final Library library;
  final Map<String, dynamic> data;
  final String type;
  const _RelatedMedia({
    required this.api,
    required this.library,
    required this.data,
    required this.type,
  });
  @override
  Widget build(BuildContext context) {
    final rows = (data['recommendations']?['results'] as List? ?? [])
        .whereType<Map>()
        .take(10)
        .toList();
    if (rows.isEmpty) return const SizedBox();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 26),
        Text(
          context.tr("Contenus similaires"),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 220,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: rows.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final related = MediaItem.fromJson(
                Map<String, dynamic>.from(rows[i]),
                type: type,
              );
              return SizedBox(
                width: 122,
                child: MediaCard(
                  item: related,
                  library: library,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DetailScreen(
                        api: api,
                        library: library,
                        item: related,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class SourcesPanel extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final MediaItem item;
  final int? season, episode;
  const SourcesPanel({
    super.key,
    required this.api,
    required this.library,
    required this.item,
    this.season,
    this.episode,
  });
  @override
  State<SourcesPanel> createState() => _SourcesPanelState();
}

class _SourcesPanelState extends State<SourcesPanel> {
  List<StreamSource> rows = [];
  List<String> failed = [];
  String? language, error;
  bool loading = true;
  String? opening;
  int generation = 0;
  @override
  void initState() {
    super.initState();
    unawaited(load());
  }

  @override
  void didUpdateWidget(SourcesPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.key != widget.item.key ||
        oldWidget.season != widget.season ||
        oldWidget.episode != widget.episode ||
        oldWidget.api != widget.api) {
      rows = [];
      language = null;
      unawaited(load());
    }
  }

  Future<void> load() async {
    final ticket = ++generation;
    setState(() {
      loading = true;
      error = null;
      failed = [];
    });
    try {
      final result = await widget.api.sources(
        widget.item,
        season: widget.season,
        episode: widget.episode,
        onProgress: (progress) {
          if (mounted && ticket == generation) {
            setState(() {
              rows = progress.sources;
              failed = progress.failed;
            });
          }
        },
      );
      if (mounted && ticket == generation) setState(() => rows = result);
    } catch (e) {
      if (mounted && ticket == generation) {
        setState(
          () => error = e is ApiFailure
              ? e.message
              : 'Impossible de charger les liens.',
        );
      }
    } finally {
      if (mounted && ticket == generation) setState(() => loading = false);
    }
  }

  Future<void> openSource(StreamSource source, {bool download = false}) async {
    if (opening != null) return;
    setState(() => opening = source.url);
    try {
      final resolved = await widget.api.resolveSource(source);
      if (!mounted) return;
      if (download) {
        final job = Downloads.start(
          widget.library,
          widget.item,
          resolved,
          season: widget.season,
          episode: widget.episode,
        );
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.tr("Téléchargement demandé. Suivi dans Téléchargements."),
            ),
          ),
        );
        setState(() => opening = null);
        await job;
      } else {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PlayerScreen(
              library: widget.library,
              item: widget.item,
              source: resolved,
              season: widget.season,
              episode: widget.episode,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is ApiFailure
                  ? context.l10n.message(e.message)
                  : context.tr("Impossible d’ouvrir ce lien."),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => opening = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    const languages = SourceListPolicy.languages;
    final groups = rows.map((s) => s.languageGroup).toSet();
    final selected =
        language ?? languages.where(groups.contains).firstOrNull ?? 'VF';
    final visible = SourceListPolicy.forLanguage(rows, selected);
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.episode != null) ...[
          Text(
            context.tr("Saison {0} · Épisode {1}", [
              widget.season,
              widget.episode,
            ]),
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
        ],
        Text(
          context.tr("Sources disponibles"),
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontSize: 22),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            for (final value in languages)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    selected: value == selected,
                    showCheckmark: false,
                    selectedColor: const Color(0xffed214d),
                    labelStyle: TextStyle(
                      color: value == selected ? Colors.white : null,
                      fontWeight: FontWeight.bold,
                    ),
                    label: SizedBox(
                      width: double.infinity,
                      child: Text(
                        context.tr(value),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    onSelected: (_) => setState(() => language = value),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 36),
        if (loading) ...[
          const LinearProgressIndicator(),
          const SizedBox(height: 8),
          Text(
            rows.isEmpty
                ? context.tr("Recherche des sources…")
                : context.tr("Recherche d’autres liens…"),
          ),
          const SizedBox(height: 12),
        ],
        if (visible.isEmpty && (error != null || !loading))
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              (error == null ? null : context.l10n.message(error!)) ??
                  (rows.isEmpty
                      ? context.tr("Aucun lien disponible pour ce titre.")
                      : context.tr("Aucun lien {0} disponible.", [
                          context.tr(selected),
                        ])),
            ),
          ),
        for (final source in visible)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _SourceFocus(
              child: Material(
                color: Theme.of(context).colorScheme.surfaceContainerHigh,
                child: ListTile(
                  dense: true,
                  minTileHeight: 40,
                  minLeadingWidth: 20,
                  horizontalTitleGap: 10,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 0,
                  ),
                  leading: opening == source.url
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(
                          Icons.play_circle_fill,
                          color: Color(0xffed214d),
                        ),
                  title: Text(
                    SourceListPolicy.display(source, visible),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                  ),
                  onTap: () => openSource(source),
                  trailing: IconButton(
                    tooltip: context.tr("Télécharger"),
                    onPressed: () => openSource(source, download: true),
                    icon: const Icon(Icons.download_outlined, size: 20),
                  ),
                ),
              ),
            ),
          ),
        if (!loading && failed.isNotEmpty)
          Text(
            context.tr("{0} fournisseur(s) momentanément indisponible(s).", [
              failed.length,
            ]),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        if (!loading)
          TextButton.icon(
            onPressed: load,
            icon: const Icon(Icons.refresh),
            label: Text(context.tr("Actualiser les liens")),
          ),
      ],
    );
    // Wide layouts keep both columns independently scrollable. Mobile flows vertically.
    if (MediaQuery.sizeOf(context).width >= 850) {
      return SingleChildScrollView(
        key: const ValueKey('detail-sources'),
        child: content,
      );
    }
    return content;
  }
}

class _SourceFocus extends StatefulWidget {
  final Widget child;
  const _SourceFocus({required this.child});
  @override
  State<_SourceFocus> createState() => _SourceFocusState();
}

class _SourceFocusState extends State<_SourceFocus> {
  bool focused = false;
  @override
  Widget build(BuildContext context) => Focus(
    canRequestFocus: false,
    onFocusChange: (value) {
      setState(() => focused = value);
      if (value) {
        Scrollable.ensureVisible(
          context,
          alignment: .5,
          duration: const Duration(milliseconds: 150),
        );
      }
    },
    child: Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          width: 2.5,
          color: focused ? const Color(0xffed214d) : Colors.transparent,
        ),
      ),
      child: widget.child,
    ),
  );
}
