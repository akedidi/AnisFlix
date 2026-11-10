class WatchProvider {
  final int id;
  final String name;
  const WatchProvider(this.id, this.name);
  String get logo => 'assets/providers/$id.jpg';
}

const watchProviders = [
  WatchProvider(8, 'Netflix'),
  WatchProvider(9, 'Amazon Prime'),
  WatchProvider(350, 'Apple TV+'),
  WatchProvider(531, 'Paramount+'),
  WatchProvider(337, 'Disney+'),
  WatchProvider(1899, 'HBO Max'),
  WatchProvider(386, 'Peacock'),
  WatchProvider(381, 'Canal+'),
  WatchProvider(283, 'Crunchyroll'),
  WatchProvider(415, 'ADN'),
  WatchProvider(234, 'Arte'),
  WatchProvider(11, 'MUBI'),
  WatchProvider(1754, 'TF1+'),
  WatchProvider(147, 'M6+'),
];
