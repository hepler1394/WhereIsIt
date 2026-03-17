import SwiftUI
import Combine

/// Global app state shared across all views.
@MainActor
class AppState: ObservableObject {
    // MARK: - User State
    @Published var isAuthenticated = false
    @Published var hasCompletedOnboarding = false
    @Published var currentUser: User?
    @Published var subscriptionTier: SubscriptionTier = .free

    // MARK: - Store State
    @Published var selectedStore: Store?
    @Published var nearbyStores: [Store] = []
    @Published var favoriteStores: [Store] = []

    // MARK: - Theme
    @Published var currentTheme: ChainTheme = .default
    @Published var colorScheme: ColorScheme? = nil // nil = system

    // MARK: - Search
    @Published var recentSearches: [String] = []

    // MARK: - Methods

    func selectStore(_ store: Store) {
        selectedStore = store
        if let theme = ChainTheme.forChain(store.chainSlug) {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentTheme = theme
            }
        }
    }

    func addRecentSearch(_ query: String) {
        recentSearches.removeAll { $0.lowercased() == query.lowercased() }
        recentSearches.insert(query, at: 0)
        if recentSearches.count > 20 { recentSearches = Array(recentSearches.prefix(20)) }
    }
}

// MARK: - Subscription Tiers

enum SubscriptionTier: String, Codable {
    case free
    case premium
    case enterprise
}
