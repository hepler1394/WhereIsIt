import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab: Tab = .search

    enum Tab: String, CaseIterable {
        case search = "Search"
        case deals = "Deals"
        case community = "Community"
        case profile = "Profile"

        var icon: String {
            switch self {
            case .search: return "magnifyingglass"
            case .deals: return "tag.fill"
            case .community: return "person.3.fill"
            case .profile: return "person.crop.circle"
            }
        }
    }

    var body: some View {
        Group {
            if appState.hasCompletedOnboarding {
                mainTabView
            } else {
                OnboardingView()
            }
        }
        .animation(.easeInOut, value: appState.hasCompletedOnboarding)
    }

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            SearchView()
                .tabItem {
                    Label(Tab.search.rawValue, systemImage: Tab.search.icon)
                }
                .tag(Tab.search)

            DealsView()
                .tabItem {
                    Label(Tab.deals.rawValue, systemImage: Tab.deals.icon)
                }
                .tag(Tab.deals)

            CommunityView()
                .tabItem {
                    Label(Tab.community.rawValue, systemImage: Tab.community.icon)
                }
                .tag(Tab.community)

            ProfileView()
                .tabItem {
                    Label(Tab.profile.rawValue, systemImage: Tab.profile.icon)
                }
                .tag(Tab.profile)
        }
        .tint(appState.currentTheme.primary)
    }
}
