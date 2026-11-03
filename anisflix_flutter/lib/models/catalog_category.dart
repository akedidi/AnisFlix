class CatalogCategory {
  final String title, type;
  final int? genre;
  final bool latest;

  const CatalogCategory(
    this.title,
    this.type, {
    this.genre,
    this.latest = false,
  });
}

const movieCategories = [
  CatalogCategory('Derniers films', 'movie', latest: true),
  CatalogCategory('Action', 'movie', genre: 28),
  CatalogCategory('Drame', 'movie', genre: 18),
  CatalogCategory('Policier', 'movie', genre: 80),
  CatalogCategory('Mystère', 'movie', genre: 9648),
  CatalogCategory('Documentaire', 'movie', genre: 99),
  CatalogCategory('Science-fiction', 'movie', genre: 878),
  CatalogCategory('Animation', 'movie', genre: 16),
];

const seriesCategories = [
  CatalogCategory('Dernières séries', 'tv', latest: true),
  CatalogCategory('Action & Aventure', 'tv', genre: 10759),
  CatalogCategory('Drame', 'tv', genre: 18),
  CatalogCategory('Policier', 'tv', genre: 80),
  CatalogCategory('Mystère', 'tv', genre: 9648),
  CatalogCategory('Documentaire', 'tv', genre: 99),
  CatalogCategory('Science-fiction', 'tv', genre: 10765),
  CatalogCategory('Animation', 'tv', genre: 16),
];

// ProviderMediaListView.swift: order and combined provider/genre categories.
const providerCategories = [
  CatalogCategory('Films', 'movie'),
  CatalogCategory('Séries', 'tv'),
  CatalogCategory("Films d'Action", 'movie', genre: 28),
  CatalogCategory('Films de Drame', 'movie', genre: 18),
  CatalogCategory('Films de Comédie', 'movie', genre: 35),
  CatalogCategory("Séries d'Action", 'tv', genre: 10759),
  CatalogCategory('Séries de Drame', 'tv', genre: 18),
  CatalogCategory('Séries de Comédie', 'tv', genre: 35),
];
