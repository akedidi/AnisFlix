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
  const ProviderDirectoryScreen({
    super.key,
    required this.api,
    required this.library,
    required this.tv,
  });
  @override
  Widget build(BuildContext context) => CustomScrollView(
    slivers: [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
        sliver: SliverToBoxAdapter(
          child: Text(
            context.tr("Plateformes"),
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        sliver: SliverLayoutBuilder(
          builder: (context, constraints) {
            final columns = (watchProviders.length / 2).ceil();
            final minimumWidth = columns * 112.0 + 20 * (columns - 1);
            final gridWidth = constraints.crossAxisExtent < minimumWidth
                ? minimumWidth
                : constraints.crossAxisExtent;
            final width = (gridWidth - 20 * (columns - 1)) / columns;
            return SliverToBoxAdapter(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: gridWidth,
                  height: 2 * (width + 34) + 20,
                  child: GridView.builder(
                    primary: false,
                    padding: EdgeInsets.zero,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      mainAxisExtent: width + 34,
                      mainAxisSpacing: 20,
                      crossAxisSpacing: 20,
                    ),
                    itemCount: watchProviders.length,
                    itemBuilder: (context, index) {
                      final provider = watchProviders[index];
                      return Semantics(
                        button: true,
                        label: provider.name,
                        child: InkWell(
                          key: ValueKey('provider-${provider.id}'),
                          borderRadius: BorderRadius.circular(12),
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
                          child: Column(
                            children: [
                              AspectRatio(
                                aspectRatio: 1,
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.asset(
                                    provider.logo,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => ColoredBox(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .surfaceContainerHigh,
                                      child: const Icon(
                                        Icons.live_tv,
                                        size: 48,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                provider.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.titleSmall,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
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
