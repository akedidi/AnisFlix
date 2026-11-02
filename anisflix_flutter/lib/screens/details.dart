import 'dart:async';

import 'package:flutter/material.dart';

import '../models/media.dart';
import '../services/catalog_api.dart';
import '../services/downloads.dart';
import '../services/library.dart';
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
  int? season;
  @override
  void initState() {
    super.initState();
    details = widget.item.type == 'tv'
        ? loadDetails()
        : Future.value(<String, dynamic>{});
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
      final preferred = widget.initialSeason;
      final selected = preferred != null && available.contains(preferred)
          ? preferred
          : available.firstWhere((s) => s > 0, orElse: () => available.first);
      chooseSeason(selected);
    }
    return result;
  }

  void chooseSeason(int value) {
    setState(() {
      season = value;
      episodes = widget.api.season(widget.item.id, value);
    });
  }

  void play({int? episode}) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => SourceScreen(
        api: widget.api,
        library: widget.library,
        item: widget.item,
        season: season,
        episode: episode,
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.item.title)),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        if (widget.item.backdrop != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: SizedBox(
              height: 240,
              child: Image.network(
                'https://image.tmdb.org/t/p/w1280${widget.item.backdrop}',
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox(),
              ),
            ),
          ),
        const SizedBox(height: 24),
        Text(
          widget.item.title,
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: 12),
        Text(
          '${widget.item.date}  ·  ★ ${widget.item.rating.toStringAsFixed(1)}',
        ),
        const SizedBox(height: 16),
        Text(
          widget.item.overview.isEmpty
              ? 'Aucun résumé disponible.'
              : widget.item.overview,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            if (widget.item.type == 'movie')
              FilledButton.icon(
                onPressed: play,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Regarder'),
              ),
            AnimatedBuilder(
              animation: widget.library,
              builder: (_, _) => OutlinedButton.icon(
                onPressed: () => widget.library.toggleFavorite(widget.item),
                icon: Icon(
                  widget.library.favorites.containsKey(widget.item.key)
                      ? Icons.favorite
                      : Icons.favorite_outline,
                ),
                label: const Text('Favoris'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        if (widget.item.type == 'tv')
          FutureBuilder(
            future: details,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Column(
                  children: [
                    const Text('Impossible de charger les saisons.'),
                    OutlinedButton(
                      onPressed: () => setState(() => details = loadDetails()),
                      child: const Text('Réessayer'),
                    ),
                  ],
                );
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final seasons = (snapshot.data!['seasons'] as List? ?? [])
                  .whereType<Map>()
                  .toList();
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final s in seasons)
                    ChoiceChip(
                      selected: season == s['season_number'],
                      label: Text(s['name'] ?? 'Saison ${s['season_number']}'),
                      onSelected: (_) =>
                          chooseSeason((s['season_number'] as num).toInt()),
                    ),
                ],
              );
            },
          ),
        if (episodes != null)
          FutureBuilder(
            future: episodes,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Column(
                  children: [
                    const Text('Impossible de charger les épisodes.'),
                    TextButton(
                      onPressed: () => chooseSeason(season!),
                      child: const Text('Réessayer'),
                    ),
                  ],
                );
              }
              if (!snapshot.hasData) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              final rows = (snapshot.data!['episodes'] as List? ?? [])
                  .whereType<Map>()
                  .toList();
              return Column(
                children: [
                  for (final ep in rows)
                    Card(
                      child: ListTile(
                        autofocus:
                            ep['episode_number'] == widget.initialEpisode,
                        leading: const Icon(Icons.play_circle_outline),
                        title: Text(
                          '${ep['episode_number']}. ${ep['name'] ?? 'Épisode'}',
                        ),
                        subtitle: Text(
                          ep['overview'] ?? '',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        onTap: () => play(
                          episode: (ep['episode_number'] as num).toInt(),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        if (widget.item.type == 'tv' &&
            widget.initialSeason != null &&
            season == null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: FilledButton(
              onPressed: () => chooseSeason(widget.initialSeason!),
              child: const Text('Reprendre cette saison'),
            ),
          ),
      ],
    ),
  );
}

class SourceScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final MediaItem item;
  final int? season, episode;
  const SourceScreen({
    super.key,
    required this.api,
    required this.library,
    required this.item,
    this.season,
    this.episode,
  });
  @override
  State<SourceScreen> createState() => _SourceScreenState();
}

class _SourceScreenState extends State<SourceScreen> {
  late Future<List<StreamSource>> sources;
  @override
  void initState() {
    super.initState();
    sources = load();
  }

  Future<List<StreamSource>> load() => widget.api.sources(
    widget.item,
    season: widget.season,
    episode: widget.episode,
  );
  void open(StreamSource source) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => PlayerScreen(
        library: widget.library,
        item: widget.item,
        source: source,
        season: widget.season,
        episode: widget.episode,
      ),
    ),
  );
  Future<void> download(StreamSource source) async {
    try {
      final future = Downloads.start(
        widget.library,
        widget.item,
        source,
        season: widget.season,
        episode: widget.episode,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Téléchargement demandé. Suivi dans Téléchargements.'),
        ),
      );
      await future;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is StateError ? e.message : 'Le téléchargement a échoué.',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Choisir une source')),
    body: FutureBuilder(
      future: sources,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final rows = snapshot.data ?? [];
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              widget.item.title,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 20),
            if (snapshot.hasError || rows.isEmpty) ...[
              Text(
                snapshot.error is ApiFailure
                    ? (snapshot.error as ApiFailure).message
                    : 'Aucune source directe disponible pour ce titre.',
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => setState(() => sources = load()),
                child: const Text('Réessayer'),
              ),
            ],
            for (final source in rows)
              Card(
                child: ListTile(
                  leading: const Icon(Icons.play_circle),
                  title: Text(source.label),
                  subtitle: Text(source.language),
                  onTap: () => open(source),
                  trailing: IconButton(
                    tooltip: 'Télécharger',
                    onPressed: () => download(source),
                    icon: const Icon(Icons.download_outlined),
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}
