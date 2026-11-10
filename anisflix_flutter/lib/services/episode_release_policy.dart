import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Matches SeriesDetailView and ReleaseDateUtils in the native iOS app.
class EpisodeReleasePolicy {
  static final _paris = () {
    tzdata.initializeTimeZones();
    return tz.getLocation('Europe/Paris');
  }();

  static bool isAvailable(String? airDate, {DateTime? now}) {
    final raw = airDate?.trim() ?? '';
    // Virtual seasons can contain episodes with no known broadcast date.
    if (raw.isEmpty) return true;
    final instant = now ?? DateTime.now();
    if (raw.contains('T')) {
      final date = DateTime.tryParse(raw);
      return date == null || !date.isAfter(instant);
    }
    final match = RegExp(r'^\d{4}-\d{2}-\d{2}').firstMatch(raw);
    if (match == null) return true;
    final parisNow = tz.TZDateTime.from(instant, _paris);
    final today =
        '${parisNow.year.toString().padLeft(4, '0')}-'
        '${parisNow.month.toString().padLeft(2, '0')}-'
        '${parisNow.day.toString().padLeft(2, '0')}';
    final comparison = match[0]!.compareTo(today);
    return comparison < 0 || (comparison == 0 && parisNow.hour >= 20);
  }
}
