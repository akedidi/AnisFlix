import 'dart:async';

import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../models/catalog_category.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import '../widgets/media_category_row.dart';
import 'catalog.dart';
import 'details.dart';

class CatalogCategoriesScreen extends StatefulWidget {
  final CatalogApi api;
  final Library library;
  final String type;
  final bool tv;

  const CatalogCategoriesScreen({
    super.key,
    required this.api,
    required this.library,
    required this.type,
    required this.tv,
  });

  @override
  State<CatalogCategoriesScreen> createState() =>
      _CatalogCategoriesScreenState();
}

class _CatalogCategoriesScreenState extends State<CatalogCategoriesScreen> {
  final pages = <CatalogCategory, Future<MediaPage>>{};

  List<CatalogCategory> get categories =>
      widget.type == 'tv' ? seriesCategories : movieCategories;

  Future<MediaPage> fetch(CatalogCategory category) {
    final future = widget.api.list(
      category.type,
      latest: category.latest,
      genre: category.genre,
    );
    // Rows below the viewport may fail before their FutureBuilder is mounted.
    unawaited(future.then<void>((_) {}, onError: (Object _, StackTrace _) {}));
    return future;
  }

  void reload() {
    pages.clear();
    for (final category in categories) {
      pages[category] = fetch(category);
    }
  }

  @override
  void initState() {
    super.initState();
    reload();
  }

  @override
  void didUpdateWidget(CatalogCategoriesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.type != oldWidget.type || widget.api != oldWidget.api) reload();
  }

  void seeAll(CatalogCategory category) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (context) => Scaffold(
        appBar: AppBar(title: Text(context.tr(category.title))),
        body: CatalogScreen(
          api: widget.api,
          library: widget.library,
          section: category.type == 'tv' ? 2 : 1,
          tv: widget.tv,
          latestOverride: category.latest,
          initialGenre: category.genre,
          showHeading: false,
          showFilters: false,
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => ListView(
    key: PageStorageKey('catalog-categories-${widget.type}'),
    children: [
      for (final category in categories)
        MediaCategoryRow(
          key: ValueKey(
            'catalog-category-${category.type}-${category.genre ?? 'latest'}',
          ),
          title: category.title,
          library: widget.library,
          future: pages[category]!,
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
        ),
      const SizedBox(height: 24),
    ],
  );
}
