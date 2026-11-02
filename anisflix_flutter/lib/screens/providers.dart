import 'package:flutter/material.dart';

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
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Text('Plateformes', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 20),
      for (final provider in [
        (8, 'Netflix'),
        (9, 'Prime Video'),
        (337, 'Disney+'),
        (350, 'Apple TV+'),
        (531, 'Paramount+'),
        (1899, 'Max'),
      ])
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 16,
              runSpacing: 8,
              children: [
                SizedBox(
                  width: 160,
                  child: Text(
                    provider.$2,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                for (final section in [(1, 'Films'), (2, 'Séries')])
                  OutlinedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => Scaffold(
                          appBar: AppBar(
                            title: Text('${provider.$2} · ${section.$2}'),
                          ),
                          body: CatalogScreen(
                            api: api,
                            library: library,
                            section: section.$1,
                            tv: tv,
                            initialProvider: provider.$1,
                          ),
                        ),
                      ),
                    ),
                    child: Text(section.$2),
                  ),
              ],
            ),
          ),
        ),
    ],
  );
}
