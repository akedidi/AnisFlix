import 'dart:convert';
import 'dart:io';

import 'package:anisflix_flutter/models/catalog_category.dart';
import 'package:anisflix_flutter/models/media.dart';
import 'package:anisflix_flutter/services/provider_catalog_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final reference = jsonDecode(
    File('recovery/ios-provider-catalog-reference.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  test(
    'provider categories match the native view in order, type and genre',
    () {
      expect([
        for (final category in providerCategories)
          {
            'title': category.title,
            'type': category.type,
            'genre': category.genre,
          },
      ], reference['categories']);
    },
  );

  test(
    'all four queries match captured Swift requests, across Paris noon and DST',
    () {
      for (final fixture in reference['cases'] as List) {
        for (final request in fixture['requests'] as List) {
          final expected = Map<String, String>.from(request['parameters']);
          final actual = ProviderCatalogPolicy.parameters(
            (request['path'] as String).split('/').last,
            provider: fixture['provider'] as int,
            page: fixture['page'] as int,
            genre: int.tryParse(expected['with_genres'] ?? ''),
            now: DateTime.parse(fixture['now']),
          );
          expect(
            {'language': 'fr-FR', ...actual},
            expected,
            reason: '${fixture['now']} ${request['path']} $expected',
          );
        }
      }
    },
  );

  test('provider lists exclude future and undated titles and sort each page by date', () {
    final items = ProviderCatalogPolicy.releasedItems(const [
      MediaItem(id: 1, type: 'movie', title: 'Old', date: '2024-01-01'),
      MediaItem(id: 2, type: 'movie', title: 'Undated'),
      MediaItem(id: 3, type: 'movie', title: 'Future', date: '2099-01-01'),
      MediaItem(id: 4, type: 'movie', title: 'Today', date: '2026-01-15'),
      MediaItem(id: 5, type: 'movie', title: 'Recent', date: '2025-12-01'),
      MediaItem(id: 6, type: 'movie', title: 'Same date', date: '2025-12-01'),
    ], now: DateTime(2026, 1, 15, 18));
    expect(items.map((item) => item.id), [4, 5, 6, 1]);
  });
}
