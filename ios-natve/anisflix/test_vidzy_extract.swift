import Foundation

let semaphore = DispatchSemaphore(value: 0)

let tmdbId = 1504358

let infoUrl = "https://anisflix.vercel.app/api/movix-proxy?path=vixsrc/movie/\(tmdbId)"
var req = URLRequest(url: URL(string: infoUrl)!)
URLSession.shared.dataTask(with: req) { data, _, _ in
    if let data = data, let str = String(data: data, encoding: .utf8) {
        print("Vixsrc Response: \(str)")
    }
    semaphore.signal()
}.resume()

semaphore.wait()
