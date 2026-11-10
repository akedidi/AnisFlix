import '../models/media.dart';

/// Mirrors StreamingSourceListOrdering and MovieDetailView/SeriesDetailView in iOS.
class SourceListPolicy {
  static const languages = ['VF', 'VOSTFR', 'VO'];
  static int providerRank(String provider) {
    final value = provider.toLowerCase();
    if (value.contains('luluvid')) return 99;
    return const {
          'frenchstream': 0,
          'streamzo': 1,
          'fsvid': 2,
          'yflix': 3,
          'vaplayer': 4,
          'vidzy': 5,
          'animesama': 6,
          'frenchanime': 7,
          'animepahe': 8,
          'hianime': 9,
          'moviebox': 10,
          'mob': 11,
          'megacdn': 12,
          'vidmoly': 13,
          'afterdark': 14,
          'darkibox': 15,
          'darki': 15,
          'movix': 16,
          'vixsrc': 90,
        }[value] ??
        50;
  }

  static int qualityValue(String quality) {
    final q = quality.toLowerCase();
    if (q.contains('4k') || q.contains('2160')) return 2160;
    for (final resolution in [1080, 720, 480, 360]) {
      if (q.contains('$resolution')) return resolution;
    }
    return 0;
  }

  static String qualityDisplay(String quality) {
    final value = qualityValue(quality);
    return value == 2160
        ? '4K'
        : value > 0
        ? '${value}p'
        : quality;
  }

  static int compare(StreamSource a, StreamSource b) {
    final rank = providerRank(a.provider).compareTo(providerRank(b.provider));
    if (rank != 0) return rank;
    final name = a.provider.toLowerCase().compareTo(b.provider.toLowerCase());
    return name != 0
        ? name
        : qualityValue(b.quality).compareTo(qualityValue(a.quality));
  }

  static List<StreamSource> forLanguage(
    List<StreamSource> sources,
    String language,
  ) {
    final rows = sources.indexed
        .where((r) => r.$2.languageGroup == language)
        .toList();
    rows.sort((a, b) {
      final value = compare(a.$2, b.$2);
      return value == 0 ? a.$1.compareTo(b.$1) : value;
    });
    return rows.map((r) => r.$2).toList();
  }

  static String display(StreamSource source, List<StreamSource> visible) {
    final provider = source.provider.toLowerCase();
    final same = visible.where((s) => s.provider == source.provider).toList();
    final index = same.indexWhere((s) => s.url == source.url) + 1;
    final quality = qualityDisplay(source.quality);
    if (provider == 'movix' || provider == 'darkibox') {
      final group = same
          .where((s) => qualityDisplay(s.quality) == quality)
          .toList();
      return group.length > 1
          ? '$quality #${group.indexWhere((s) => s.url == source.url) + 1} (${source.language})'
          : '$quality (${source.language})';
    }
    if (provider == 'mob') return 'MOB - $quality';
    const names = {
      'animesama': 'Anime-Sama',
      'frenchanime': 'French-Anime',
      'frenchstream': 'French Stream',
      'streamzo': 'Streamzo',
      'animepahe': 'AnimePahe',
      'hianime': 'HiAnime',
      'vaplayer': 'VaPlayer',
      'vixsrc': 'Vixsrc',
      'yflix': 'YFlix',
    };
    final name =
        names[provider] ??
        (provider.isEmpty
            ? ''
            : '${provider[0].toUpperCase()}${provider.substring(1)}');
    if (provider == 'animepahe') {
      return 'AnimePahe - $quality — ${source.language}';
    }
    if (provider == 'vidmoly') return 'Vidmoly $index - HD';
    return '$name $index - $quality — ${source.language}';
  }
}
