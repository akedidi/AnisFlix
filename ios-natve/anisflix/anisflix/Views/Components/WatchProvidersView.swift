
import SwiftUI

struct WatchProvidersView: View {
    let providers: WatchProvidersResponse?
    @ObservedObject var theme = AppTheme.shared
    
    var body: some View {
        if let providers = providers, let results = providers.results {
            // Priority: FR -> US -> CA -> First available
            if let regionCode = results.keys.contains("FR") ? "FR" :
                                results.keys.contains("US") ? "US" :
                                results.keys.contains("CA") ? "CA" :
                                results.keys.first,
               let regionData = results[regionCode] {
                
                let uniqueProviders = getUniqueProviders(from: regionData)
                
                if !uniqueProviders.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Disponible sur \(regionCode == "FR" ? "(France)" : "(\(regionCode))")")
                            .font(.caption)
                            .foregroundColor(theme.secondaryText)
                            .textCase(.uppercase)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(uniqueProviders) { provider in
                                    if let url = provider.logoURL {
                                        // Button removed as per user request to make providers non-clickable
                                        CachedAsyncImagePhased(url: url) { phase in
                                            if let image = phase.image {
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fit)
                                                    .frame(width: 44, height: 44)
                                                    .cornerRadius(8)
                                                    .shadow(radius: 2)
                                            } else {
                                                Rectangle()
                                                    .fill(theme.cardBackground)
                                                    .frame(width: 44, height: 44)
                                                    .cornerRadius(8)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.top, 8)
                }
            }
        }
    }

    
    private func getUniqueProviders(from regionData: WatchProviderRegion) -> [WatchProvider] {
        let flatrate = regionData.flatrate ?? []
        let rent = regionData.rent ?? []
        let buy = regionData.buy ?? []
        
        let allProviders = flatrate + rent + buy
        var seenIds = Set<Int>()
        var uniqueProviders: [WatchProvider] = []
        
        for provider in allProviders {
            if !seenIds.contains(provider.id) {
                seenIds.insert(provider.id)
                uniqueProviders.append(provider)
            }
        }
        return uniqueProviders
    }
}
