class MediaItem {
  final int id;
  final String type, title, overview, date;
  final String? poster, backdrop;
  final double rating;
  final List<int> genreIds;
  final int? latestSeason, latestEpisode;
  const MediaItem({
    required this.id,
    required this.type,
    required this.title,
    this.overview = '',
    this.poster,
    this.backdrop,
    this.rating = 0,
    this.date = '',
    this.genreIds = const [],
    this.latestSeason,
    this.latestEpisode,
  });
  factory MediaItem.fromJson(Map<String, dynamic> j, {String? type}) =>
      MediaItem(
        id: (j['id'] as num).toInt(),
        genreIds:
            (j['genre_ids'] as List? ??
                    (j['genres'] as List? ?? [])
                        .whereType<Map>()
                        .map((g) => g['id'])
                        .toList())
                .whereType<num>()
                .map((n) => n.toInt())
                .toList(),
        latestSeason: (j['episodeInfo']?['season'] as num?)?.toInt(),
        latestEpisode: (j['episodeInfo']?['episode'] as num?)?.toInt(),
        type: type ?? j['media_type'] ?? 'movie',
        title: j['title'] ?? j['name'] ?? 'Sans titre',
        overview: j['overview'] ?? '',
        poster: j['poster_path'],
        backdrop: j['backdrop_path'],
        rating: (j['vote_average'] as num? ?? 0).toDouble(),
        date: j['release_date'] ?? j['first_air_date'] ?? '',
      );
  String get key => '$type:$id';
  String? get posterUrl =>
      poster == null ? null : 'https://image.tmdb.org/t/p/w500$poster';
  Map<String, dynamic> toJson() => {
    'id': id,
    'genre_ids': genreIds,
    if (latestEpisode != null)
      'episodeInfo': {'season': latestSeason, 'episode': latestEpisode},
    'media_type': type,
    'title': title,
    'overview': overview,
    'poster_path': poster,
    'backdrop_path': backdrop,
    'vote_average': rating,
    'release_date': date,
  };
}

class SourceSubtitle {
  final String url, label, language;
  const SourceSubtitle(this.url, this.label, this.language);
  Map<String, String> toJson() => {
    'file': url,
    'label': label,
    'language': language,
  };
}

class StreamSource {
  final String url, label, language;
  final String format, provider, quality;
  final Map<String, String> headers;
  final List<SourceSubtitle> subtitles;
  const StreamSource(
    this.url,
    this.label, {
    this.language = '',
    this.format = '',
    this.provider = '',
    this.quality = '',
    this.headers = const {},
    this.subtitles = const [],
  });
  bool get needsExtraction =>
      ['embed', 'iframe'].contains(format.toLowerCase());
  String get languageGroup {
    final lang = language.trim().toLowerCase();
    if (lang.contains('vost') ||
        lang.contains('subtitle') ||
        lang.contains('subbed')) {
      return 'VOSTFR';
    }
    final words = lang
        .replaceAll(RegExp(r'[^a-z0-9]+'), ' ')
        .split(' ')
        .toSet();
    if (words.intersection({
      'vf',
      'vfq',
      'french',
      'francais',
      'fr',
      'fra',
      'fre',
    }).isNotEmpty) {
      return 'VF';
    }
    return 'VO';
  }

  static StreamSource? parse(
    Map<String, dynamic> j,
    String provider, {
    Uri? base,
  }) {
    if ('${j['provider'] ?? ''}'.toLowerCase() == 'debug') return null;
    final value = j['url'] ?? j['decoded_url'] ?? j['link'] ?? j['file'];
    if (value is! String || value.trim().isEmpty) return null;
    final uri = base?.resolve(value) ?? Uri.tryParse(value);
    if (uri == null ||
        !['http', 'https'].contains(uri.scheme) ||
        uri.host.isEmpty) {
      return null;
    }
    final headers = <String, String>{};
    if (j['headers'] is Map) {
      (j['headers'] as Map).forEach((k, v) {
        if (v is String) headers[k.toString()] = v;
      });
    }
    final name = '${j['provider'] ?? j['server'] ?? j['player'] ?? provider}';
    final display =
        const {
          'moviebox': 'MovieBox',
          'vaplayer': 'VaPlayer',
          'yflix': 'YFlix',
          'frenchstream': 'French Stream',
          'streamzo': 'Streamzo',
          'vixsrc': 'VixSrc',
          'animesama': 'Anime-Sama',
          'frenchanime': 'French-Anime',
          'animepahe': 'AnimePahe',
          'hianime': 'HiAnime',
          'anime-api': 'AnimeAPI',
          'afterdark': 'AfterDark',
        }[name.toLowerCase()] ??
        name;
    final quality = '${j['quality'] ?? 'Auto'}';
    return StreamSource(
      uri.toString(),
      '$display · $quality',
      provider: name,
      quality: quality,
      language: '${j['language'] ?? j['lang'] ?? j['languageLabel'] ?? ''}',
      format: '${j['type'] ?? j['format'] ?? ''}',
      headers: headers,
      subtitles: [
        for (final track in (j['tracks'] ?? j['subtitles'] ?? []) as List)
          if (track is Map &&
              (track['kind'] == null ||
                  ['captions', 'subtitles'].contains(track['kind'])))
            if (Uri.tryParse('${track['file'] ?? track['url'] ?? ''}')
                case final Uri uri
                when ['https', 'http'].contains(uri.scheme) &&
                    uri.host.isNotEmpty)
              SourceSubtitle(
                uri.toString(),
                '${track['label'] ?? track['language'] ?? 'Sous-titres'}',
                '${track['language'] ?? track['srclang'] ?? ''}',
              ),
      ],
    );
  }
}
