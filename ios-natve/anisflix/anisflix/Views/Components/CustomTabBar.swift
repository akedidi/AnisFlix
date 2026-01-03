//
//  CustomTabBar.swift
//  anisflix
//
//  Created by AI Assistant on 02/01/2026.
//

import SwiftUI

struct CustomTabBar: View {
    @Binding var selectedTab: Int
    @ObservedObject var theme: AppTheme
    var activeDownloadsCount: Int
    var onTabTap: ((Int) -> Void)? = nil
    var onTabDoubleTap: ((Int) -> Void)? = nil
    
    // Namespace for animations if needed, though simple scale/color is requested
    @Namespace private var animationNamespace
    
    var body: some View {
        HStack {
            TabBarButton(
                icon: "house",
                selectedIcon: "house.fill",
                title: theme.t("nav.home"),
                tabIndex: 0,
                selectedTab: $selectedTab,
                theme: theme,
                onTap: onTabTap,
                onDoubleTap: onTabDoubleTap
            )
            
            TabBarButton(
                icon: "magnifyingglass",
                selectedIcon: "magnifyingglass",
                title: "Explorer",
                tabIndex: 1,
                selectedTab: $selectedTab,
                theme: theme,
                onTap: onTabTap,
                onDoubleTap: onTabDoubleTap
            )
            
            TabBarButton(
                icon: "tv",
                selectedIcon: "tv.fill",
                title: theme.t("nav.tvChannels"),
                tabIndex: 2,
                selectedTab: $selectedTab,
                theme: theme,
                onTap: onTabTap,
                onDoubleTap: onTabDoubleTap
            )
            
            // 4. Téléchargements
            TabBarButton(
                icon: "arrow.down.circle",
                selectedIcon: "arrow.down.circle.fill",
                title: "Téléch.",
                tabIndex: 3,
                selectedTab: $selectedTab,
                theme: theme,
                badge: activeDownloadsCount,
                onTap: onTabTap,
                onDoubleTap: onTabDoubleTap
            )
            
            // 5. Plus (Menu)
            TabBarButton(
                icon: "ellipsis.circle",
                selectedIcon: "ellipsis.circle.fill",
                title: "Plus",
                tabIndex: 4,
                selectedTab: $selectedTab,
                theme: theme,
                onTap: onTabTap,
                onDoubleTap: onTabDoubleTap
            )
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 8)
        .background(
            ZStack {
                // Blur Effect
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark) // Force dark tint for the blur
                
                // Dark Tint Overlay for "deeper" dark
                Color.black.opacity(0.3)
            }
        )
        .cornerRadius(35)
        .shadow(color: Color.black.opacity(0.4), radius: 10, x: 0, y: 5)
        .padding(.horizontal, 12) // Reduced from 20 to give more width
        // Ensure it sits above the bottom safe area
        .padding(.bottom, 0) 
    }
}

struct TabBarButton: View {
    let icon: String
    let selectedIcon: String
    let title: String
    let tabIndex: Int
    @Binding var selectedTab: Int
    let theme: AppTheme
    var badge: Int = 0
    var onTap: ((Int) -> Void)? = nil
    var onDoubleTap: ((Int) -> Void)? = nil
    
    var isSelected: Bool {
        selectedTab == tabIndex
    }
    
    var body: some View {
        Button {
            if isSelected {
                // Already on this tab, trigger pop-to-root
                onDoubleTap?(tabIndex)
            } else {
                // Switching to a different tab
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    selectedTab = tabIndex
                }
            }
        } label: {
            VStack(spacing: 4) {
                ZStack {
                    Image(systemName: isSelected ? selectedIcon : icon)
                        .font(.system(size: 22))
                        .scaleEffect(isSelected ? 1.1 : 1.0)
                        .foregroundColor(isSelected ? AppTheme.primaryRed : .gray)
                    
                    if badge > 0 {
                        Text("\(badge)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                            .padding(4)
                            .background(AppTheme.primaryRed)
                            .clipShape(Circle())
                            .offset(x: 10, y: -10)
                    }
                }
                
                // Optional: Show label only if selected or always? 
                // Previous design often hides labels for cleaner look, or shows small.
                // Request said "floating", usually implies minimalist. 
                // Git log suggestion showed labels. Let's keep them small.
                if isSelected {
                    Text(title)
                        .font(.system(size: 10, weight: .bold)) // Fixed small size
                        .foregroundColor(AppTheme.primaryRed)
                        .transition(.opacity.combined(with: .scale))
                        .lineLimit(1)
                        .minimumScaleFactor(0.5) // Allow aggressive shrinking
                }
            }
            .frame(maxWidth: .infinity)
        }
    }
}

// Helper for background color on simplified views
extension View {
    func backgroundColor(_ color: Color) -> some View {
        self.background(color)
    }
}

