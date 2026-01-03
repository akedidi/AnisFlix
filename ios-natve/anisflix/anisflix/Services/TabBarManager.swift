//
//  TabBarManager.swift
//  anisflix
//
//  Created by AI Assistant on 03/01/2026.
//

import SwiftUI
import Combine

class TabBarManager: ObservableObject {
    static let shared = TabBarManager()
    
    @Published var isHidden: Bool = false
    
    private init() {}
    
    func show() {
        withAnimation(.easeInOut(duration: 0.3)) {
            isHidden = false
        }
    }
    
    func hide() {
        withAnimation(.easeInOut(duration: 0.3)) {
            isHidden = true
        }
    }
}
