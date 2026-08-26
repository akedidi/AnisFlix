import Foundation

let b64 = "aHR0cHM6Ly9tZWdhcGxheS5idXp6Lw==" // after URL decoded
if let data = Data(base64Encoded: b64) {
    print("Decoded: \(String(data: data, encoding: .utf8) ?? "failed")")
} else {
    print("FAILED base64Encoded")
}

let ua64 = "TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMC4wLjAuMCBTYWZhcmkvNTM3LjM2"
if let data = Data(base64Encoded: ua64) {
    print("UA Decoded: \(String(data: data, encoding: .utf8) ?? "failed")")
} else {
    print("FAILED UA base64Encoded")
}
