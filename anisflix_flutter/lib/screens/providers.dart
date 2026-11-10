import 'dart:async';

import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/watch_provider.dart';
import '../models/catalog_category.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import '../widgets/media_category_row.dart';
import 'catalog.dart';
import 'details.dart';

class ProviderDirectoryScreen extends StatelessWidget {
  final CatalogApi api;
  final Library library;
  final bool tv;
  final bool carousel;
  const ProviderDirectoryScreen({
    super.key,
    required this.api,
    required this.library,
    required this.tv,
    this.carousel = false,
  });
  Widget tile(
    BuildContext context,
    WatchProvider provider, {
    bool framed = false,
  }) {
    final radius = BorderRadius.circular(10);
    final logo = ClipRRect(
      borderRadius: radius,
      child: Image.asset(
        provider.logo,
        fit: BoxFit.contain,
        errorBuilder: (_, _, _) => const Icon(Icons.live_tv),
      ),
    );
    final title = Text(
      provider.name,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: Theme.of(context).textTheme.labelMedium,
    );
    return Semantics(
      button: true,
      child: Card(
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: framed
              ? BorderSide(color: Theme.of(context).colorScheme.outlineVariant)
              : BorderSide.none,
        ),
        child: InkWell(
          key: ValueKey('provider-${provider.id}'),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ProviderCatalogScreen(
                api: api,
                library: library,
                tv: tv,
                provider: provider,
              ),
            ),
          ),
          child: framed
              ? Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    children: [
                      Expanded(child: logo),
                      const SizedBox(height: 4),
                      title,
                    ],
                  ),
                )
              : Column(
                  children: [
                    AspectRatio(aspectRatio: 1, child: logo),
                    SizedBox(height: 34, child: Center(child: title)),
                  ],
                ),
        ),
      ),
    );
  }

  Widget horizontalRow(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Text(
          context.tr('Par Plateforme'),
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      SizedBox(
        height: 112,
        child: ListView.separated(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          scrollDirection: Axis.horizontal,
          itemCount: watchProviders.length,
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (context, index) => SizedBox(
            width: 92,
            child: tile(context, watchProviders[index], framed: true),
          ),
        ),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    if (carousel) return horizontalRow(context);
    if (tv) {
      return GridView.builder(
        padding: const EdgeInsets.all(24),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 7,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.15,
        ),
        itemCount: watchProviders.length,
        itemBuilder: (context, index) =>
            tile(context, watchProviders[index], framed: true),
      );
    }
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.all(24),
          sliver: SliverLayoutBuilder(
            builder: (context, constraints) {
              const columns = 7;
              const spacing = 20.0;
              final minimumWidth = columns * 112 + spacing * (columns - 1);
              final width = constraints.crossAxisExtent.clamp(
                minimumWidth,
                double.infinity,
              );
              final cellWidth = (width - spacing * (columns - 1)) / columns;
              return SliverToBoxAdapter(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SizedBox(
                    width: width,
                    height: 2 * (cellWidth + 34) + spacing,
                    child: GridView.builder(
                      primary: false,
                      padding: EdgeInsets.zero,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        mainAxisExtent: cellWidth + 34,
                        mainAxisSpacing: spacing,
                        crossAxisSpacing: spacing,
                      ),
                      itemCount: watchProviders.length,
                      itemBuilder: (context, index) =>
                          tile(context, watchProviders[index]),
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

class ProviderCatalogScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final bool tv;
  final WatchProvider provider;
  const ProviderCatalogScreen({
    super.key,
    required this.api,
    required this.library,
    required this.tv,
    required this.provider,
  });
  @override
  State<ProviderCatalogScreen> createState() => _ProviderCatalogScreenState();
}

class _ProviderCatalogScreenState extends State<ProviderCatalogScreen> {
  final pages = <CatalogCategory, Future<MediaPage>>{};
  late String language;

  @override
  void initState() {
    super.initState();
    reload();
  }

  @override
  void didUpdateWidget(ProviderCatalogScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.provider.id != oldWidget.provider.id ||
        widget.api != oldWidget.api ||
        widget.library.language != language) {
      reload();
    }
  }

  Future<MediaPage> fetch(CatalogCategory category) {
    final future = widget.api
        .list(
          category.type,
          provider: widget.provider.id,
          genre: category.genre,
        )
        .then(
          (page) => MediaPage(
            page.items.take(10).toList(),
            page.page,
            page.totalPages,
          ),
        );
    unawaited(future.then<void>((_) {}, onError: (Object _, StackTrace _) {}));
    return future;
  }

  void reload() {
    language = widget.library.language;
    pages.clear();
    for (final category in providerCategories) {
      pages[category] = fetch(category);
    }
  }

  void seeAll(CatalogCategory category) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => Scaffold(
        appBar: AppBar(
          title: Text(
            '${widget.provider.name} - ${context.tr(category.title)}',
          ),
        ),
        body: CatalogScreen(
          api: widget.api,
          library: widget.library,
          section: category.type == 'tv' ? 2 : 1,
          tv: widget.tv,
          initialProvider: widget.provider.id,
          initialGenre: category.genre,
          showHeading: false,
          showFilters: false,
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.provider.name)),
    body: ListView(
      scrollCacheExtent: widget.tv
          ? MediaCategoryRow.tvScrollCacheExtent
          : null,
      key: PageStorageKey(
        'provider-categories-${widget.provider.id}-$language',
      ),
      children: [
        for (final category in providerCategories)
          FutureBuilder<MediaPage>(
            key: ValueKey(
              'provider-category-${widget.provider.id}-${category.type}-${category.genre ?? 'all'}',
            ),
            future: pages[category],
            builder: (context, snapshot) {
              if (snapshot.hasData && snapshot.data!.items.isEmpty) {
                return const SizedBox.shrink();
              }
              return MediaCategoryRow(
                title: category.title,
                future: pages[category]!,
                library: widget.library,
                tv: widget.tv,
                seeAll: () => seeAll(category),
                retry: () => setState(() {
                  pages[category] = fetch(category);
                }),
                onSelected: (item) => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DetailScreen(
                      api: widget.api,
                      library: widget.library,
                      item: item,
                    ),
                  ),
                ),
              );
            },
          ),
        const SizedBox(height: 24),
      ],
    ),
  );
}
