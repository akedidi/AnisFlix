//
//  CachedAsyncImage.swift
//  anisflix
//
//  Created by AI Assistant on 28/12/2024.
//

import SwiftUI

/// A cached version of AsyncImage that stores loaded images in ImageCache
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder
    
    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var loadFailed = false
    
    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }
    
    var body: some View {
        Group {
            if let image = loadedImage {
                content(Image(uiImage: image))
            } else if loadFailed {
                placeholder()
            } else {
                placeholder()
                    .onAppear {
                        loadImage()
                    }
            }
        }
    }
    
    private func loadImage() {
        guard let url = url, !isLoading else { return }
        
        // Check cache first
        if let cachedImage = ImageCache.shared.getImage(for: url) {
            self.loadedImage = cachedImage
            return
        }
        
        isLoading = true
        
        // Load from network
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    // Cache the image
                    ImageCache.shared.setImage(image, for: url)
                    
                    await MainActor.run {
                        self.loadedImage = image
                        self.isLoading = false
                    }
                } else {
                    await MainActor.run {
                        self.loadFailed = true
                        self.isLoading = false
                    }
                }
            } catch {
                await MainActor.run {
                    self.loadFailed = true
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Convenience Initializers

extension CachedAsyncImage where Placeholder == ProgressView<EmptyView, EmptyView> {
    /// Initialize with default ProgressView placeholder
    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content
    ) {
        self.init(url: url, content: content, placeholder: { ProgressView() })
    }
}

extension CachedAsyncImage where Content == Image, Placeholder == ProgressView<EmptyView, EmptyView> {
    /// Initialize with just a URL (simplest form)
    init(url: URL?) {
        self.init(url: url, content: { $0 }, placeholder: { ProgressView() })
    }
}

// MARK: - AsyncImage-compatible Wrapper

/// A phase-based CachedAsyncImage that mimics AsyncImage's API
struct CachedAsyncImagePhased<Content: View>: View {
    let url: URL?
    let content: (AsyncImagePhase) -> Content
    
    @State private var phase: AsyncImagePhase = .empty
    
    init(url: URL?, @ViewBuilder content: @escaping (AsyncImagePhase) -> Content) {
        self.url = url
        self.content = content
    }
    
    var body: some View {
        content(phase)
            .onAppear {
                loadImage()
            }
    }
    
    private func loadImage() {
        guard let url = url else {
            phase = .empty
            return
        }
        
        // Check cache first
        if let cachedImage = ImageCache.shared.getImage(for: url) {
            phase = .success(Image(uiImage: cachedImage))
            return
        }
        
        // Load from network
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let uiImage = UIImage(data: data) {
                    // Cache the image
                    ImageCache.shared.setImage(uiImage, for: url)
                    
                    await MainActor.run {
                        self.phase = .success(Image(uiImage: uiImage))
                    }
                } else {
                    await MainActor.run {
                        self.phase = .failure(URLError(.cannotDecodeContentData))
                    }
                }
            } catch {
                await MainActor.run {
                    self.phase = .failure(error)
                }
            }
        }
    }
}
