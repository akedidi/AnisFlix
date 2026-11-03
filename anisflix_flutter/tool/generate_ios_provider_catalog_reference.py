#!/usr/bin/env python3
"""Capture the native provider queries without making network requests."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

project = Path(__file__).resolve().parent.parent
root = Path(sys.argv[1]) if len(sys.argv) > 1 else project.parent / 'ios-natve/anisflix/anisflix'
paths = ['Services/TMDBService.swift', 'Utils/ReleaseDateUtils.swift',
         'Views/Lists/ProviderMediaListView.swift']
sources = {path: (root / path).read_text() for path in paths}
service = sources[paths[0]]
methods = []
for name in ['fetchMoviesByProvider', 'fetchSeriesByProvider',
             'fetchMoviesByProviderAndGenre', 'fetchSeriesByProviderAndGenre']:
    start = service.index(f'    func {name}(')
    end = service.index('\n    }', start) + len('\n    }')
    methods.append(service[start:end])

categories = [
    {'title': title, 'type': 'tv' if kind == 'series' else 'movie',
     'genre': None if genre == 'nil' else int(genre)}
    for title, genre, kind in re.findall(
        r'MediaRow\(\s*title: "([^"]+)"[\s\S]*?'
        r'seeAllRoute: \.providerCategoryList\([^\n]*genreId: (nil|\d+), mediaType: \.(movie|series)\)',
        sources[paths[2]],
    )
]
if len(categories) != 8:
    raise ValueError('Expected the eight native provider categories')

program = '''import Foundation
import Dispatch
var referenceNow = Date()
struct Media {}
enum MediaType { case movie, series }
struct TMDBMedia {
    func toMedia(mediaType: MediaType) -> Media { Media() }
}
struct TMDBResponse { let results: [TMDBMedia] }
final class TMDBService {
    let baseURL = "https://api.themoviedb.org/3"
    let apiKey = "fixture"
    var captured: [[String: Any]] = []
    func resolvedLanguage(_ language: String?) -> String { language ?? "fr-FR" }
    func fetch(from endpoint: String) async throws -> TMDBResponse {
        let url = URLComponents(string: endpoint)!
        let params = Dictionary(uniqueKeysWithValues: url.queryItems!
            .filter { $0.name != "api_key" }
            .map { ($0.name, $0.value!) })
        captured.append(["path": url.path, "parameters": params])
        return TMDBResponse(results: [])
    }
'''+ '\n'.join(methods) + '\n}\n' + sources[paths[1]].replace(
    'let now = Date()', 'let now = referenceNow'
) + '''
_ = Task {
    let service = TMDBService()
    var result: [[String: Any]] = []
    for instant in ["2026-01-15T10:59:00Z", "2026-01-15T11:00:00Z",
                    "2026-07-15T09:59:00Z", "2026-07-15T10:00:00Z"] {
        referenceNow = ISO8601DateFormatter().date(from: instant)!
        for provider in [8, 9] {
            let region = provider == 9 ? "US" : "FR"
            for page in [1, 2] {
                service.captured = []
                _ = try await service.fetchMoviesByProvider(providerId: provider, page: page, language: "fr-FR", region: region)
                _ = try await service.fetchSeriesByProvider(providerId: provider, page: page, language: "fr-FR", region: region)
                _ = try await service.fetchMoviesByProviderAndGenre(providerId: provider, genreId: 28, page: page, language: "fr-FR", region: region)
                _ = try await service.fetchSeriesByProviderAndGenre(providerId: provider, genreId: 10759, page: page, language: "fr-FR", region: region)
                result.append(["now": instant, "provider": provider, "page": page, "requests": service.captured])
            }
        }
    }
    let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!)
    exit(0)
}
dispatchMain()
'''
with tempfile.TemporaryDirectory(prefix='anisflix-ios-provider-') as directory:
    swift = Path(directory) / 'main.swift'
    swift.write_text(program)
    captured = json.loads(subprocess.check_output(['swift', str(swift)], text=True))

reference = {
    'source': 'ios-natve/anisflix/anisflix',
    'sha256': {path: hashlib.sha256(source.encode()).hexdigest()
               for path, source in sources.items()},
    'categories': categories,
    'cases': captured,
}
target = project / 'recovery/ios-provider-catalog-reference.json'
target.write_text(json.dumps(reference, ensure_ascii=False, indent=2) + '\n')
print(f'Wrote {target} ({len(captured)} native query cases)')
