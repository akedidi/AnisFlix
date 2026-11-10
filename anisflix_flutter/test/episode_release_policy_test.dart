import 'package:anisflix_flutter/services/episode_release_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('undated virtual episodes remain visible', () {
    for (final date in [null, '', '  ', 'unknown', 'invalidTdate']) {
      expect(EpisodeReleasePolicy.isAvailable(date), isTrue);
    }
  });

  test('past and future episodes are separated at the Paris date boundary', () {
    final now = DateTime.parse('2026-11-04T23:30:00Z');
    expect(EpisodeReleasePolicy.isAvailable('2026-11-04', now: now), isTrue);
    expect(EpisodeReleasePolicy.isAvailable('2026-11-05', now: now), isFalse);
    expect(EpisodeReleasePolicy.isAvailable('2026-11-06', now: now), isFalse);
  });

  test('same-day episodes unlock at 20:00 Paris in winter and summer', () {
    for (final sample in [
      ('2026-11-04', '2026-11-04T19:00:00Z'),
      ('2026-07-04', '2026-07-04T18:00:00Z'),
    ]) {
      final cutoff = DateTime.parse(sample.$2);
      expect(EpisodeReleasePolicy.isAvailable(sample.$1, now: cutoff), isTrue);
      expect(
        EpisodeReleasePolicy.isAvailable(
          sample.$1,
          now: cutoff.subtract(const Duration(seconds: 1)),
        ),
        isFalse,
      );
    }
  });

  test('explicit ISO timestamps use their actual release instant', () {
    final now = DateTime.parse('2026-11-04T09:00:00Z');
    expect(
      EpisodeReleasePolicy.isAvailable('2026-11-04T10:00:00+01:00', now: now),
      isTrue,
    );
    expect(
      EpisodeReleasePolicy.isAvailable('2026-11-04T09:00:00.001Z', now: now),
      isFalse,
    );
  });
}
