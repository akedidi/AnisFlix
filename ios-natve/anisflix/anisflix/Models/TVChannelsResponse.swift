//
//  TVChannelsResponse.swift
//  anisflix
//
//  Created by AI Assistant
//

import Foundation

// API Response types
struct TVChannelsResponse: Codable {
    let sections: [TVSection]
}

struct TVSection: Codable {
    let id: String
    let name: String
    let categories: [TVCategoryAPI]
}

struct TVCategoryAPI: Codable {
    let id: String
    let name: String
    let channels: [TVChannelAPI]
}

struct TVChannelAPI: Codable {
    let id: String
    let name: String
    let logo: String?
    let links: [TVChannelLink]
}
