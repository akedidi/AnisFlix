//
//  TVChannel.swift
//  anisflix
//
//  Created by AI Assistant on 28/11/2025.
//

import Foundation

struct TVChannelLink: Codable, Hashable {
    let type: String // "mpd", "hls_direct", "hls_segments"
    let url: String
}

struct TVChannel: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let logo: String
    let streamUrl: String // Deprecated, use links
    let category: String // "France" or "Arab"
    let group: String
    let epgId: String?
    let links: [TVChannelLink]?
    
    // Pour l'affichage
    var displayName: String { name }
}

struct TVGroup: Identifiable, Hashable {
    let id: String
    let name: String
    var channels: [TVChannel]
}
