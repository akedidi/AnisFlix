//
//  TVService.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import Foundation

class TVService {
    static let shared = TVService()
    
    private init() {}
    
    // Base URL for API
    private let baseUrl = "https://anisflix.vercel.app"
    
    // MARK: - API Methods
    
    func fetchSections() async throws -> [TVSection] {
        let url = URL(string: "\(baseUrl)/api/tv-channels")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let response = try JSONDecoder().decode(TVChannelsResponse.self, from: data)
        return response.sections
    }
    
    func fetchChannels() async throws -> [TVChannel] {
        let sections = try await fetchSections()
        
        // Convert API response to flat channel list
        var allChannels: [TVChannel] = []
        for section in sections {
            for category in section.categories {
                for apiChannel in category.channels {
                    let channel = TVChannel(
                        id: apiChannel.id,
                        name: apiChannel.name,
                        logo: apiChannel.logo ?? "",
                        streamUrl: "", // Deprecated
                        category: section.id, // Using section.id as category
                        group: category.name,
                        epgId: nil,
                        links: apiChannel.links
                    )
                    allChannels.append(channel)
                }
            }
        }
        
        return allChannels
    }
    
    func fetchGroups(category: String) async throws -> [TVGroup] {
        let sections = try await fetchSections()
        
        // Find the section matching the category
        guard let section = sections.first(where: { $0.id == category.lowercased() }) else {
            return []
        }
        
        // Convert categories to groups
        var groups: [TVGroup] = []
        for category in section.categories {
            let channels = category.channels.map { apiChannel in
                TVChannel(
                    id: apiChannel.id,
                    name: apiChannel.name,
                    logo: apiChannel.logo ?? "",
                    streamUrl: "", // Deprecated
                    category: section.id,
                    group: category.name,
                    epgId: nil,
                    links: apiChannel.links
                )
            }
            groups.append(TVGroup(id: category.id, name: category.name, channels: channels))
        }
        
        return groups
    }
    
    
    func searchChannels(query: String) async -> [TVChannel] {
        guard !query.isEmpty else { return [] }
        let lowerQuery = query.lowercased()
        
        // Fetch from API
        let allChannels = (try? await fetchChannels()) ?? []
        return allChannels.filter { $0.name.lowercased().contains(lowerQuery) }
    }
    
    // MARK: - Proxy & Link Logic
    
    func getFilteredLinks(for channel: TVChannel) -> [TVChannelLink] {
        guard let links = channel.links else { return [] }
        // On iOS (Native), filter out MPD, keep only HLS
        return links.filter { $0.type != "mpd" }
    }
    
    func getProxyUrl(originalUrl: String, type: String) -> String {
        // For hls_segments, ALWAYS use the proxy
        if type == "hls_segments" {
            // Extract channel ID from fremtv.lol URLs
            // Regex: /\/live\/[^\/]+\/(\d+)\.m3u8/
            if let regex = try? NSRegularExpression(pattern: "/live/[^/]+/(\\d+)\\.m3u8"),
               let match = regex.firstMatch(in: originalUrl, range: NSRange(originalUrl.startIndex..., in: originalUrl)),
               let range = Range(match.range(at: 1), in: originalUrl) {
                let channelId = String(originalUrl[range])
                return "\(baseUrl)/api/media-proxy?channelId=\(channelId)"
            }
        }
        
        // For hls_direct, use DIRECT URL (matching Web/Capacitor logic)
        // The web app uses direct URLs for hls_direct on Capacitor.
        // We only proxy hls_segments.
        if type == "hls_direct" {
            return originalUrl
        }
        
        return originalUrl
    }
}
