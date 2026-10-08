import Foundation
import AVFoundation
import CoreMedia
import CoreVideo
import MobileVLCKit
import ObjectiveC.runtime
import UIKit

private let browserHeaders = [
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro",
]

private enum TestFailure: Error, CustomStringConvertible {
    case invalidURL(String)
    case http(Int, String)
    case invalidJSON(String)
    case noStream
    case playback(String)
    case pip(String)

    var description: String {
        switch self {
        case .invalidURL(let value): return "URL invalide: \(value)"
        case .http(let status, let url): return "HTTP \(status): \(url)"
        case .invalidJSON(let step): return "Réponse JSON invalide: \(step)"
        case .noStream: return "Aucun flux Vidlink utilisable"
        case .playback(let reason): return "Lecture VLC échouée: \(reason)"
        case .pip(let reason): return "PiP VLC échoué: \(reason)"
        }
    }
}

private func request(_ url: URL, method: String = "GET", headers: [String: String] = [:], body: Data? = nil) throws -> Data {
    let semaphore = DispatchSemaphore(value: 0)
    var result: Result<Data, Error>!
    var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)
    request.httpMethod = method
    request.httpBody = body
    headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
    URLSession.shared.dataTask(with: request) { data, response, error in
        defer { semaphore.signal() }
        if let error { result = .failure(error); return }
        let status = (response as? HTTPURLResponse)?.statusCode ?? -1
        guard (200..<300).contains(status) else {
            result = .failure(TestFailure.http(status, url.absoluteString))
            return
        }
        result = .success(data ?? Data())
    }.resume()
    semaphore.wait()
    return try result.get()
}

private func jsonObject(_ data: Data, step: String) throws -> [String: Any] {
    guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw TestFailure.invalidJSON(step)
    }
    return value
}

private func isExpired(_ value: String) -> Bool {
    guard let url = URL(string: value),
          let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
          let raw = components.queryItems?.first(where: { $0.name.lowercased() == "t" })?.value,
          let expiry = TimeInterval(raw) else { return false }
    return expiry <= Date().timeIntervalSince1970
}

private func backendStream(tmdbID: String) throws -> URL? {
    var components = URLComponents(string: "https://anisflix.vercel.app/api/movix-proxy")!
    components.queryItems = [
        URLQueryItem(name: "path", value: "vidlink"),
        URLQueryItem(name: "tmdbId", value: tmdbID),
        URLQueryItem(name: "type", value: "movie"),
        URLQueryItem(name: "client", value: "ios-native-playback-test"),
        URLQueryItem(name: "_", value: String(Int(Date().timeIntervalSince1970))),
    ]
    let payload = try jsonObject(request(components.url!), step: "liste backend")
    let streams = payload["streams"] as? [[String: Any]] ?? []
    print("📡 Liste backend: \(streams.count) flux")
    for stream in streams {
        guard let rawURL = stream["url"] as? String else { continue }
        let quality = stream["quality"] as? String ?? "Auto"
        if isExpired(rawURL) {
            print("⚠️ \(quality): signature expirée, flux ignoré")
            continue
        }
        if let url = URL(string: rawURL) { return url }
    }
    return nil
}

private func base64URL(_ value: String) -> String {
    Data(value.utf8).base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
}

private func discoverWebKitStream(tmdbID: String) throws -> URL {
    let encURL = URL(string: "https://enc-dec.app/api/enc-vidlink?text=\(tmdbID)")!
    let encrypted = try jsonObject(request(encURL), step: "chiffrement")["result"] as? String
    guard let encrypted else { throw TestFailure.invalidJSON("chiffrement") }

    let target = "https://vidlink.pro/api/b/movie/\(encrypted)?multiLang=0"
    var worker = URLComponents(string: "https://anisflix.kedidi-anis.workers.dev/")!
    worker.queryItems = [
        URLQueryItem(name: "path", value: "mob"),
        URLQueryItem(name: "method", value: "GET"),
        URLQueryItem(name: "url", value: target),
    ]
    var upstreamHeaders = browserHeaders
    upstreamHeaders["Accept"] = "application/json,*/*"
    upstreamHeaders["X-Playback-Environment"] = "webkit"
    let body = try JSONSerialization.data(withJSONObject: ["headers": upstreamHeaders, "body": NSNull()])
    let raw = try jsonObject(request(worker.url!, method: "POST", headers: ["Content-Type": "application/json"], body: body), step: "API Vidlink WebKit")

    guard let stream = raw["stream"] as? [String: Any],
          stream["requiresProxy"] as? Bool == true,
          let playlist = stream["playlist"] as? String,
          let source = URL(string: playlist),
          let sourceScheme = source.scheme,
          let sourceHost = source.host,
          let playlistHeaders = stream["playlistHeaders"] as? [String: Any],
          let cookie = (playlistHeaders["Cookie"] ?? playlistHeaders["cookie"]) as? String else {
        throw TestFailure.noStream
    }

    var output = URLComponents()
    output.scheme = "https"
    output.host = "flood.sourcerrr.online"
    output.path = "/sacdn\(source.path)"
    output.queryItems = [
        URLQueryItem(name: "host", value: "\(sourceScheme)://\(sourceHost)"),
        URLQueryItem(name: "sc", value: base64URL(cookie)),
    ]
    guard let url = output.url else { throw TestFailure.invalidURL(output.string ?? "") }
    print("✅ Découverte locale: manifeste WebKit DASH signé")
    return url
}

private final class PlaybackProbe: NSObject, VLCMediaPlayerDelegate {
    let player = VLCMediaPlayer()
    private let drawable = UIView(frame: CGRect(x: 0, y: 0, width: 320, height: 180))
    var finished = false
    var failure: String?

    override init() {
        super.init()
        player.delegate = self
        player.drawable = drawable
    }

    func mediaPlayerStateChanged(_ notification: Notification) {
        let state = VLCMediaPlayerStateToString(player.state)
        print("   VLC: \(state)")
        fflush(stdout)
        if player.state == .error {
            failure = state
            finished = true
        } else if player.state == .ended && player.time.intValue < 1_000 {
            failure = "fin avant 1 seconde"
            finished = true
        }
    }

    func mediaPlayerTimeChanged(_ notification: Notification) {
        let milliseconds = player.time.intValue
        print("   vidéo: \(milliseconds) ms")
        fflush(stdout)
        if milliseconds >= 1_000 { finished = true }
    }
}

private typealias TestVideoLockCallback = @convention(c) (
    UnsafeMutableRawPointer?,
    UnsafeMutablePointer<UnsafeMutableRawPointer?>?
) -> UnsafeMutableRawPointer?

private typealias TestVideoUnlockCallback = @convention(c) (
    UnsafeMutableRawPointer?,
    UnsafeMutableRawPointer?,
    UnsafePointer<UnsafeMutableRawPointer?>?
) -> Void

private typealias TestVideoDisplayCallback = @convention(c) (
    UnsafeMutableRawPointer?,
    UnsafeMutableRawPointer?
) -> Void

@_silgen_name("libvlc_video_set_callbacks")
private func testLibVLCSetVideoCallbacks(
    _ player: UnsafeMutableRawPointer?,
    _ lock: TestVideoLockCallback?,
    _ unlock: TestVideoUnlockCallback?,
    _ display: TestVideoDisplayCallback?,
    _ opaque: UnsafeMutableRawPointer?
)

@_silgen_name("libvlc_video_set_format")
private func testLibVLCSetVideoFormat(
    _ player: UnsafeMutableRawPointer?,
    _ chroma: UnsafePointer<CChar>?,
    _ width: UInt32,
    _ height: UInt32,
    _ pitch: UInt32
)

private final class TestRawFrame {
    let pixelBuffer: CVPixelBuffer
    private var isLocked = false

    init?(probe: SampleBufferProbe) {
        guard let buffer = probe.makePixelBuffer(),
              CVPixelBufferLockBaseAddress(buffer, []) == kCVReturnSuccess,
              CVPixelBufferGetBaseAddress(buffer) != nil else { return nil }
        pixelBuffer = buffer
        isLocked = true
    }

    var baseAddress: UnsafeMutableRawPointer? {
        CVPixelBufferGetBaseAddress(pixelBuffer)
    }

    func unlock() {
        guard isLocked else { return }
        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        isLocked = false
    }

    deinit { unlock() }
}

private let testVideoLock: TestVideoLockCallback = { opaque, planes in
    guard let opaque,
          let planes,
          let frame = TestRawFrame(
            probe: Unmanaged<SampleBufferProbe>.fromOpaque(opaque).takeUnretainedValue()
          ),
          let address = frame.baseAddress else { return nil }
    planes.pointee = address
    return Unmanaged.passRetained(frame).toOpaque()
}

private let testVideoUnlock: TestVideoUnlockCallback = { _, picture, _ in
    guard let picture else { return }
    Unmanaged<TestRawFrame>.fromOpaque(picture).takeUnretainedValue().unlock()
}

private let testVideoDisplay: TestVideoDisplayCallback = { opaque, picture in
    guard let opaque, let picture else { return }
    let probe = Unmanaged<SampleBufferProbe>.fromOpaque(opaque).takeUnretainedValue()
    let frame = Unmanaged<TestRawFrame>.fromOpaque(picture).takeRetainedValue()
    frame.unlock()
    probe.receive(frame.pixelBuffer)
}

/// Exercises the same libVLC -> CVPixelBuffer -> AVSampleBufferDisplayLayer
/// route used by the application's Vidlink Picture in Picture implementation.
private final class SampleBufferProbe {
    let player = VLCMediaPlayer()
    let displayLayer = AVSampleBufferDisplayLayer()
    private(set) var frameCount = 0
    private(set) var nonBlackFrameCount = 0
    private(set) var layerFailure: String?

    private let width = 640
    private let height = 360
    private let attributes: CFDictionary = [
        kCVPixelBufferIOSurfacePropertiesKey: [:],
        kCVPixelBufferMetalCompatibilityKey: true,
        kCVPixelBufferCGImageCompatibilityKey: true,
        kCVPixelBufferBytesPerRowAlignmentKey: 64,
    ] as CFDictionary
    private(set) var pitch = 640 * 4

    init() {
        var prototype: CVPixelBuffer?
        CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32BGRA,
            attributes,
            &prototype
        )
        pitch = prototype.map(CVPixelBufferGetBytesPerRow) ?? width * 4
        displayLayer.videoGravity = .resizeAspect
    }

    func makePixelBuffer() -> CVPixelBuffer? {
        var buffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32BGRA,
            attributes,
            &buffer
        )
        return status == kCVReturnSuccess ? buffer : nil
    }

    func connect() -> Bool {
        let selector = NSSelectorFromString("libVLCMediaPlayer")
        guard player.responds(to: selector) else { return false }
        typealias PlayerPointerGetter = @convention(c) (AnyObject, Selector) -> UnsafeMutableRawPointer?
        let getter = unsafeBitCast(player.method(for: selector), to: PlayerPointerGetter.self)
        guard let rawPlayer = getter(player, selector) else { return false }
        let opaque = Unmanaged.passUnretained(self).toOpaque()
        testLibVLCSetVideoCallbacks(rawPlayer, testVideoLock, testVideoUnlock, testVideoDisplay, opaque)
        "BGRA".withCString { chroma in
            testLibVLCSetVideoFormat(rawPlayer, chroma, UInt32(width), UInt32(height), UInt32(pitch))
        }
        return true
    }

    func receive(_ pixelBuffer: CVPixelBuffer) {
        let containsImage = containsNonBlackPixels(pixelBuffer)
        DispatchQueue.main.async { [self] in
            var format: CMVideoFormatDescription?
            guard CMVideoFormatDescriptionCreateForImageBuffer(
                allocator: kCFAllocatorDefault,
                imageBuffer: pixelBuffer,
                formatDescriptionOut: &format
            ) == noErr, let format else {
                layerFailure = "description vidéo impossible"
                return
            }
            var timing = CMSampleTimingInfo(
                duration: .invalid,
                presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()),
                decodeTimeStamp: .invalid
            )
            var sample: CMSampleBuffer?
            guard CMSampleBufferCreateReadyWithImageBuffer(
                allocator: kCFAllocatorDefault,
                imageBuffer: pixelBuffer,
                formatDescription: format,
                sampleTiming: &timing,
                sampleBufferOut: &sample
            ) == noErr, let sample else {
                layerFailure = "sample vidéo impossible"
                return
            }
            CMSetAttachment(
                sample,
                key: kCMSampleAttachmentKey_DisplayImmediately,
                value: kCFBooleanTrue,
                attachmentMode: kCMAttachmentMode_ShouldNotPropagate
            )
            if displayLayer.status == .failed { displayLayer.flush() }
            displayLayer.enqueue(sample)
            frameCount += 1
            if containsImage { nonBlackFrameCount += 1 }
            if displayLayer.status == .failed {
                layerFailure = displayLayer.error?.localizedDescription ?? "AVSampleBufferDisplayLayer en erreur"
            }
        }
    }

    private func containsNonBlackPixels(_ pixelBuffer: CVPixelBuffer) -> Bool {
        guard CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly) == kCVReturnSuccess,
              let base = CVPixelBufferGetBaseAddress(pixelBuffer) else { return false }
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
        let bytes = base.assumingMemoryBound(to: UInt8.self)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        let imageWidth = CVPixelBufferGetWidth(pixelBuffer)
        let imageHeight = CVPixelBufferGetHeight(pixelBuffer)
        var visibleSamples = 0
        for y in stride(from: 0, to: imageHeight, by: 18) {
            for x in stride(from: 0, to: imageWidth, by: 18) {
                let pixel = y * bytesPerRow + x * 4
                if bytes[pixel] > 12 || bytes[pixel + 1] > 12 || bytes[pixel + 2] > 12 {
                    visibleSamples += 1
                    if visibleSamples >= 12 { return true }
                }
            }
        }
        return false
    }
}

private func runLoop(until condition: () -> Bool, timeout: TimeInterval) {
    let deadline = Date().addingTimeInterval(timeout)
    while !condition() && Date() < deadline {
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
    }
}

private func verifySampleBufferPiP(_ media: VLCMedia) throws {
    let probe = SampleBufferProbe()
    probe.player.media = media
    probe.player.audio?.isMuted = true
    guard probe.connect() else { throw TestFailure.pip("connexion aux images VLC impossible") }
    probe.player.play()

    runLoop(until: {
        probe.frameCount >= 20 && probe.player.time.intValue >= 1_000
    }, timeout: 45)
    guard probe.frameCount >= 20 else {
        probe.player.stop()
        throw TestFailure.pip("moins de 20 images décodées (\(probe.frameCount))")
    }
    guard probe.nonBlackFrameCount > 0 else {
        probe.player.stop()
        throw TestFailure.pip("les images décodées sont noires")
    }
    guard probe.layerFailure == nil, probe.displayLayer.status != .failed else {
        probe.player.stop()
        throw TestFailure.pip(probe.layerFailure ?? "la couche vidéo a refusé les images")
    }
    print("✅ PiP: \(probe.frameCount) images, contenu visible, couche vidéo valide")

    probe.player.pause()
    let pauseTime = probe.player.time.intValue
    RunLoop.current.run(until: Date().addingTimeInterval(1.2))
    let pauseDrift = abs(probe.player.time.intValue - pauseTime)
    guard pauseDrift <= 750 else {
        probe.player.stop()
        throw TestFailure.pip("pause désynchronisée (dérive \(pauseDrift) ms)")
    }
    print("✅ PiP: pause synchronisée")

    let length = probe.player.media?.length.intValue ?? 0
    let target = length > 30_000 ? min(Int32(30_000), length - 5_000) : Int32(5_000)
    let framesBeforeSeek = probe.frameCount
    probe.player.time = VLCTime(number: NSNumber(value: target))
    probe.player.play()
    runLoop(until: {
        abs(probe.player.time.intValue - target) <= 4_000 && probe.frameCount >= framesBeforeSeek + 5
    }, timeout: 30)
    let seekDelta = abs(probe.player.time.intValue - target)
    let receivedAfterSeek = probe.frameCount >= framesBeforeSeek + 5
    probe.player.stop()
    guard seekDelta <= 4_000, receivedAfterSeek else {
        throw TestFailure.pip("seek non synchronisé (écart \(seekDelta) ms, nouvelles images: \(receivedAfterSeek))")
    }
    print("✅ PiP: seek synchronisé et nouvelles images reçues")
}

private func verifyPlayback(_ url: URL) throws {
    var manifestHeaders = browserHeaders
    manifestHeaders["Accept"] = "application/dash+xml,*/*"
    let manifest = try request(url, headers: manifestHeaders)
    guard String(data: manifest, encoding: .utf8)?.contains("<MPD") == true else {
        throw TestFailure.playback("le manifeste DASH est illisible")
    }
    print("✅ Manifeste accessible: \(manifest.count) octets")

    // Reproduce the application path: the MPD is stored locally and every
    // child DASH request goes through LocalStreamingServer so VLC receives
    // the Vidlink headers on init and media segments.
    guard let manifestText = String(data: manifest, encoding: .utf8),
          let scheme = url.scheme,
          let host = url.host else {
        throw TestFailure.playback("impossible de préparer le manifeste local")
    }
    LocalStreamingServer.shared.start()
    defer { LocalStreamingServer.shared.stop() }
    let remoteOrigin = "\(scheme)://\(host)"
    let absoluteManifest = manifestText
        .replacingOccurrences(of: "=\"/sacdn/", with: "=\"\(remoteOrigin)/sacdn/")
    let proxiedManifest = LocalStreamingServer.shared.proxyDASHSegmentTemplates(
        in: absoluteManifest,
        headers: browserHeaders
    )
    guard proxiedManifest.contains("http://127.0.0.1:") else {
        throw TestFailure.playback("les segments DASH ne passent pas par le proxy local")
    }
    let localManifest = FileManager.default.temporaryDirectory
        .appendingPathComponent("anisflix-vidlink-playback-\(UUID().uuidString).mpd")
    try proxiedManifest.write(to: localManifest, atomically: true, encoding: .utf8)
    defer { try? FileManager.default.removeItem(at: localManifest) }
    print("✅ Manifeste réécrit vers le proxy local iPhone")

    let probe = PlaybackProbe()
    let media = VLCMedia(url: localManifest)
    media.addOptions([
        "network-caching": 3_000,
        "http-user-agent": browserHeaders["User-Agent"]!,
        "http-referrer": browserHeaders["Referer"]!,
    ])
    probe.player.media = media
    probe.player.audio?.isMuted = true
    probe.player.play()

    let deadline = Date().addingTimeInterval(45)
    while !probe.finished && Date() < deadline {
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))
    }
    let milliseconds = probe.player.time.intValue
    let state = VLCMediaPlayerStateToString(probe.player.state)
    let hasVideoOutput = probe.player.hasVideoOut
    let videoSize = probe.player.videoSize
    probe.player.stop()
    guard milliseconds >= 1_000,
          probe.failure == nil,
          hasVideoOutput,
          videoSize.width > 0,
          videoSize.height > 0 else {
        throw TestFailure.playback(probe.failure ?? "délai dépassé (\(state), \(milliseconds) ms)")
    }
    print("✅ Sortie vidéo active: \(Int(videoSize.width))×\(Int(videoSize.height))")
    print("✅ Playback vidéo atteint \(milliseconds) ms")

    let pipMedia = VLCMedia(url: localManifest)
    pipMedia.addOptions([
        "network-caching": 3_000,
        "http-user-agent": browserHeaders["User-Agent"]!,
        "http-referrer": browserHeaders["Referer"]!,
        "adaptive-maxheight": 540,
    ])
    try verifySampleBufferPiP(pipMedia)
}

@main
private enum VidlinkPlaybackTest {
    static func main() {
        let tmdbID = CommandLine.arguments.dropFirst().first ?? "1458857"
        print("🎬 Test Vidlink iOS — TMDB \(tmdbID)")
        do {
            let url = try backendStream(tmdbID: tmdbID) ?? discoverWebKitStream(tmdbID: tmdbID)
            print("🔗 Lecture directe: \(url.host ?? "inconnu")\(url.path)")
            try verifyPlayback(url)
            print("\n✅ TEST RÉUSSI: le flux démarre réellement sur le lecteur iOS")
            exit(0)
        } catch {
            print("\n❌ TEST ÉCHOUÉ: \(error)")
            exit(1)
        }
    }
}
