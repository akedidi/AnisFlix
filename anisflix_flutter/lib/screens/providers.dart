import 'package:flutter/material.dart';

import '../models/watch_provider.dart';
import '../services/catalog_api.dart';
import '../services/library.dart';
import 'catalog.dart';

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
            'Plateformes',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        sliver: SliverLayoutBuilder(
          builder: (context, constraints) {
            final columns = ((constraints.crossAxisExtent + 20) / 200)
                .ceil()
                .clamp(1, 10);
            final width =
                (constraints.crossAxisExtent - 20 * (columns - 1)) / columns;
            return SliverGrid.builder(
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
                                child: const Icon(Icons.live_tv, size: 48),
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
  int section = 1;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.provider.name)),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 1, label: Text('Films')),
              ButtonSegment(value: 2, label: Text('Séries')),
            ],
            selected: {section},
            onSelectionChanged: (value) =>
                setState(() => section = value.first),
          ),
        ),
        Expanded(
          child: CatalogScreen(
            key: ValueKey(section),
            api: widget.api,
            library: widget.library,
            section: section,
            tv: widget.tv,
            initialProvider: widget.provider.id,
          ),
        ),
      ],
    ),
  );
}
