class MediaItem {
  final int id;
  final String type, title, overview, date;
  final String? poster, backdrop;
  final double rating;
  const MediaItem({
    required this.id,
    required this.type,
    required this.title,
    this.overview = '',
    this.poster,
    this.backdrop,
    this.rating = 0,
    this.date = '',
  });
  factory MediaItem.fromJson(Map<String, dynamic> j, {String? type}) =>
      MediaItem(
        id: (j['id'] as num).toInt(),
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
    'media_type': type,
    'title': title,
    'overview': overview,
    'poster_path': poster,
    'backdrop_path': backdrop,
    'vote_average': rating,
    'release_date': date,
  };
}

class StreamSource {
  final String url, label, language;
  final String format;
  final Map<String, String> headers;
  const StreamSource(
    this.url,
    this.label, {
    this.language = '',
    this.format = '',
    this.headers = const {},
  });
  static StreamSource? parse(Map<String, dynamic> j, String provider) {
    final value = j['url'] ?? j['link'] ?? j['file'];
    if (value is! String) return null;
    final uri = Uri.tryParse(value);
    if (uri == null ||
        !['http', 'https'].contains(uri.scheme) ||
        j['type'] == 'embed') {
      return null;
    }
    final headers = <String, String>{};
    if (j['headers'] is Map) {
      (j['headers'] as Map).forEach((k, v) {
        if (v is String) headers[k.toString()] = v;
      });
    }
    return StreamSource(
      value,
      '${j['provider'] ?? j['server'] ?? provider} · ${j['quality'] ?? 'Auto'}',
      language: '${j['language'] ?? j['lang'] ?? ''}',
      format: '${j['type'] ?? ''}',
      headers: headers,
    );
  }
}
