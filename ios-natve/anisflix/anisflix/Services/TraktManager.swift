//
//  TraktManager.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import Foundation
import Combine
import Security

class TraktManager: ObservableObject {
    static let shared = TraktManager()
    
    @Published var isConnected: Bool = false
    @Published var isAuthenticating: Bool = false
    @Published var deviceCode: String?
    @Published var userCode: String?
    @Published var verificationUrl: String?
    
    private let clientId = "c80fdaac1784832abfac9611a1aa50b45d3e8bb6af406fe78d79901fb9d416f8"
    private let baseURL = "https://anisflix.vercel.app/api/trakt"
    
    private var accessToken: String? {
        get { KeychainHelper.load(key: "trakt_access_token") }
        set {
            if let value = newValue {
                KeychainHelper.save(key: "trakt_access_token", data: value)
            } else {
                KeychainHelper.delete(key: "trakt_access_token")
            }
        }
    }
    
    private var refreshToken: String? {
        get { KeychainHelper.load(key: "trakt_refresh_token") }
        set {
            if let value = newValue {
                KeychainHelper.save(key: "trakt_refresh_token", data: value)
            } else {
                KeychainHelper.delete(key: "trakt_refresh_token")
            }
        }
    }
    
    private init() {
        checkConnection()
    }
    
    func checkConnection() {
        isConnected = accessToken != nil
    }
    
    // MARK: - Device Authentication
    
    func startDeviceAuth() async throws {
        isAuthenticating = true
        
        guard let url = URL(string: "\(baseURL)/device/code") else {
            throw TraktError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw TraktError.requestFailed
        }
        
        let result = try JSONDecoder().decode(DeviceCodeResponse.self, from: data)
        
        await MainActor.run {
            self.deviceCode = result.device_code
            self.userCode = result.user_code
            self.verificationUrl = result.verification_url
        }
    }
    
    func pollForToken() async throws {
        guard let deviceCode = deviceCode else {
            throw TraktError.noDeviceCode
        }
        
        guard let url = URL(string: "\(baseURL)/device/token") else {
            throw TraktError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["device_code": deviceCode]
        request.httpBody = try JSONEncoder().encode(body)
        
        // Poll every 5 seconds for up to 5 minutes
        for _ in 0..<60 {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw TraktError.requestFailed
            }
            
            if httpResponse.statusCode == 200 {
                let result = try JSONDecoder().decode(TokenResponse.self, from: data)
                
                await MainActor.run {
                    self.accessToken = result.access_token
                    self.refreshToken = result.refresh_token
                    self.isConnected = true
                    self.isAuthenticating = false
                    self.deviceCode = nil
                    self.userCode = nil
                    self.verificationUrl = nil
                }
                return
            } else if httpResponse.statusCode == 400 {
                // Still pending, continue polling
                try await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                continue
            } else if httpResponse.statusCode == 404 || httpResponse.statusCode == 410 {
                throw TraktError.codeExpired
            } else if httpResponse.statusCode == 418 {
                throw TraktError.denied
            }
        }
        
        throw TraktError.timeout
    }
    
    func disconnect() {
        accessToken = nil
        refreshToken = nil
        isConnected = false
        deviceCode = nil
        userCode = nil
        verificationUrl = nil
    }
    
    // MARK: - Scrobbling
    
    func scrobble(tmdbId: Int, type: MediaType, progress: Double, action: ScrobbleAction) async throws {
        guard let token = accessToken else {
            throw TraktError.notAuthenticated
        }
        
        guard let url = URL(string: "\(baseURL)/scrobble") else {
            throw TraktError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "access_token": token,
            type == .movie ? "movie" : "episode": [
                "ids": ["tmdb": tmdbId]
            ],
            "progress": Int(progress * 100),
            "action": action.rawValue
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw TraktError.scrobbleFailed
        }
    }
}

// MARK: - Models

struct DeviceCodeResponse: Codable {
    let device_code: String
    let user_code: String
    let verification_url: String
    let expires_in: Int
    let interval: Int
}

struct TokenResponse: Codable {
    let access_token: String
    let refresh_token: String
    let expires_in: Int
    let token_type: String
}

enum MediaType {
    case movie
    case episode
}

enum ScrobbleAction: String {
    case start
    case pause
    case stop
}

enum TraktError: Error, LocalizedError {
    case invalidURL
    case requestFailed
    case noDeviceCode
    case codeExpired
    case denied
    case timeout
    case notAuthenticated
    case scrobbleFailed
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .requestFailed: return "Request failed"
        case .noDeviceCode: return "No device code"
        case .codeExpired: return "Code expired"
        case .denied: return "Authorization denied"
        case .timeout: return "Authorization timeout"
        case .notAuthenticated: return "Not authenticated"
        case .scrobbleFailed: return "Failed to scrobble"
        }
    }
}

// MARK: - Keychain Helper

class KeychainHelper {
    static func save(key: String, data: String) {
        let data = data.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        
        guard let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}
