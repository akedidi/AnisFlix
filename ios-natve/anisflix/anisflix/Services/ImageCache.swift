//
//  ImageCache.swift
//  anisflix
//
//  Created by AI Assistant on 28/12/2024.
//

import SwiftUI
import UIKit

/// A singleton image cache that stores images in memory (NSCache) and on disk
final class ImageCache {
    static let shared = ImageCache()
    
    // MARK: - Private Properties
    
    /// In-memory cache using NSCache (automatically manages memory pressure)
    private let memoryCache = NSCache<NSString, UIImage>()
    
    /// File manager for disk operations
    private let fileManager = FileManager.default
    
    /// Directory for cached images on disk
    private lazy var cacheDirectory: URL? = {
        guard let cachesDir = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return nil
        }
        let imageDir = cachesDir.appendingPathComponent("ImageCache", isDirectory: true)
        
        // Create directory if needed
        if !fileManager.fileExists(atPath: imageDir.path) {
            try? fileManager.createDirectory(at: imageDir, withIntermediateDirectories: true)
        }
        
        return imageDir
    }()
    
    /// Serial queue for disk operations
    private let diskQueue = DispatchQueue(label: "com.anisflix.imageCache.disk", qos: .utility)
    
    // MARK: - Initialization
    
    private init() {
        // Configure memory cache limits
        memoryCache.countLimit = 100 // Max 100 images
        memoryCache.totalCostLimit = 50 * 1024 * 1024 // 50 MB
        
        // Clear old cache on startup (files older than 7 days)
        cleanOldCacheFiles()
    }
    
    // MARK: - Public Methods
    
    /// Get an image from cache (memory first, then disk)
    func getImage(for url: URL) -> UIImage? {
        let key = cacheKey(for: url)
        let urlShort = url.lastPathComponent
        
        // 1. Check memory cache first
        if let image = memoryCache.object(forKey: key as NSString) {
            print("🖼️ [ImageCache] ✅ MEMORY HIT: \(urlShort)")
            return image
        }
        
        // 2. Check disk cache
        if let image = loadImageFromDisk(key: key) {
            // Store in memory cache for faster future access
            memoryCache.setObject(image, forKey: key as NSString, cost: imageCost(image))
            print("🖼️ [ImageCache] ✅ DISK HIT: \(urlShort)")
            return image
        }
        
        print("🖼️ [ImageCache] ❌ MISS: \(urlShort)")
        return nil
    }
    
    /// Store an image in cache (both memory and disk)
    func setImage(_ image: UIImage, for url: URL) {
        let key = cacheKey(for: url)
        let urlShort = url.lastPathComponent
        
        // Store in memory cache
        memoryCache.setObject(image, forKey: key as NSString, cost: imageCost(image))
        print("🖼️ [ImageCache] 💾 STORED: \(urlShort)")
        
        // Store on disk asynchronously
        diskQueue.async { [weak self] in
            self?.saveImageToDisk(image, key: key)
        }
    }
    
    /// Clear all cached images
    func clearCache() {
        // Clear memory
        memoryCache.removeAllObjects()
        
        // Clear disk
        diskQueue.async { [weak self] in
            guard let cacheDirectory = self?.cacheDirectory else { return }
            try? self?.fileManager.removeItem(at: cacheDirectory)
            try? self?.fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        }
    }
    
    // MARK: - Private Methods
    
    /// Generate a unique cache key from URL
    private func cacheKey(for url: URL) -> String {
        // Use SHA256 hash of URL string for a safe filename
        let urlString = url.absoluteString
        return urlString.data(using: .utf8)?.base64EncodedString()
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "+", with: "-")
            .prefix(64)
            .description ?? UUID().uuidString
    }
    
    /// Calculate approximate memory cost for an image
    private func imageCost(_ image: UIImage) -> Int {
        guard let cgImage = image.cgImage else { return 0 }
        return cgImage.bytesPerRow * cgImage.height
    }
    
    /// Load image from disk cache
    private func loadImageFromDisk(key: String) -> UIImage? {
        guard let cacheDirectory = cacheDirectory else { return nil }
        let filePath = cacheDirectory.appendingPathComponent(key)
        
        guard let data = try? Data(contentsOf: filePath) else { return nil }
        return UIImage(data: data)
    }
    
    /// Save image to disk cache
    private func saveImageToDisk(_ image: UIImage, key: String) {
        guard let cacheDirectory = cacheDirectory else { return }
        let filePath = cacheDirectory.appendingPathComponent(key)
        
        // Use JPEG for smaller file size (0.8 quality is a good balance)
        guard let data = image.jpegData(compressionQuality: 0.8) else { return }
        try? data.write(to: filePath)
    }
    
    /// Clean cache files older than 7 days
    private func cleanOldCacheFiles() {
        diskQueue.async { [weak self] in
            guard let self = self, let cacheDirectory = self.cacheDirectory else { return }
            
            let maxAge: TimeInterval = 7 * 24 * 60 * 60 // 7 days
            let now = Date()
            
            guard let files = try? self.fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.contentModificationDateKey]) else { return }
            
            for file in files {
                guard let attributes = try? self.fileManager.attributesOfItem(atPath: file.path),
                      let modDate = attributes[.modificationDate] as? Date else { continue }
                
                if now.timeIntervalSince(modDate) > maxAge {
                    try? self.fileManager.removeItem(at: file)
                }
            }
        }
    }
}
