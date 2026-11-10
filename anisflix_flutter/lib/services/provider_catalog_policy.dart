import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../models/media.dart';

/// Mirrors TMDBService's four provider queries and the native list filtering.
class ProviderCatalogPolicy {
  static final _paris = () {
    tzdata.initializeTimeZones();
    return tz.getLocation('Europe/Paris');
  }();

  static String _date(DateTime value) =>
      '${value.year.toString().padLeft(4, '0')}-'
      '${value.month.toString().padLeft(2, '0')}-'
      '${value.day.toString().padLeft(2, '0')}';

  static Map<String, String> parameters(
    String type, {
    required int provider,
    required int page,
    int? genre,
    required DateTime now,
  }) {
    final parisNow = tz.TZDateTime.from(now, _paris);
    // ReleaseDateUtils.maxReleasedDateString(sameDayCutoffHour: 12).
    final releasedThrough = parisNow.hour >= 12
        ? parisNow
        : tz.TZDateTime(
            _paris,
            parisNow.year,
            parisNow.month,
            parisNow.day - 1,
          );
    return {
      'page': '$page',
      'with_watch_providers': '$provider',
      'watch_region': [9, 386].contains(provider) ? 'US' : 'FR',
      if (genre != null) 'with_genres': '$genre',
      'sort_by': type == 'movie'
          ? (genre == null ? 'release_date.desc' : 'primary_release_date.desc')
          : (genre == null ? 'popularity.desc' : 'first_air_date.desc'),
      if (type == 'movie' && genre == null) ...{
        'release_date.lte': _date(releasedThrough),
        'with_release_type': '4|5',
      },
      if (type == 'tv') 'first_air_date.lte': _date(releasedThrough),
      'with_watch_monetization_types': 'flatrate',
    };
  }

  static List<MediaItem> releasedItems(
    List<MediaItem> items, {
    required DateTime now,
  }) {
    final today = _date(now.toLocal());
    final released =
        items.indexed
            .where(
              (entry) =>
                  entry.$2.date.isNotEmpty &&
                  entry.$2.date.compareTo(today) <= 0,
            )
            .toList()
          ..sort((a, b) {
            final byDate = b.$2.date.compareTo(a.$2.date);
            return byDate != 0 ? byDate : a.$1.compareTo(b.$1);
          });
    return [for (final entry in released) entry.$2];
  }
}
