import SwiftUI

struct SearchView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var api = APIService.shared
    @State private var searchText = ""
    @State private var results: [SearchResult] = []
    @State private var deals: [Deal] = []
    @State private var isSearching = false
    @State private var hasSearched = false
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                appState.currentTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        storeHeader
                        searchBar
                        
                        if isSearching {
                            loadingView
                        } else if hasSearched {
                            resultsSection
                        } else {
                            quickCategories
                            recentSearches
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("WhereIsIt")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Store Header

    private var storeHeader: some View {
        HStack {
            Image(systemName: "mappin.circle.fill")
                .font(.title2)
                .foregroundStyle(appState.currentTheme.primary)
            VStack(alignment: .leading) {
                Text(appState.selectedStore?.name ?? "Select a Store")
                    .font(.headline)
                if let store = appState.selectedStore {
                    Text("\(store.city ?? ""), \(store.state ?? "")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button(action: { /* TODO: show store picker */ }) {
                Text("Change")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(appState.currentTheme.primary)
            }
        }
        .padding()
        .background(appState.currentTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Search for any product...", text: $searchText)
                .focused($isSearchFocused)
                .onSubmit { performSearch() }
                .textInputAutocapitalization(.never)
            if !searchText.isEmpty {
                Button(action: {
                    searchText = ""
                    hasSearched = false
                    results = []
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
        .background(appState.currentTheme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }

    // MARK: - Results

    private var resultsSection: some View {
        VStack(spacing: 16) {
            if results.isEmpty {
                emptyResults
            } else {
                ForEach(results) { result in
                    SearchResultCard(result: result, theme: appState.currentTheme)
                        .transition(.asymmetric(
                            insertion: .move(edge: .bottom).combined(with: .opacity),
                            removal: .opacity
                        ))
                }
            }

            if !deals.isEmpty {
                dealsSection
            }
        }
    }

    private var emptyResults: some View {
        VStack(spacing: 12) {
            Image(systemName: "questionmark.folder")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No results found")
                .font(.headline)
            Text("Try a different search or help by reporting where this item is!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }

    private var dealsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Active Deals", systemImage: "tag.fill")
                .font(.headline)
                .foregroundStyle(appState.currentTheme.primary)

            ForEach(deals) { deal in
                DealCard(deal: deal, theme: appState.currentTheme)
            }
        }
    }

    // MARK: - Quick Categories

    private var quickCategories: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Browse by Category")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 12) {
                ForEach(CategoryItem.quickCategories) { cat in
                    Button(action: { searchText = cat.name; performSearch() }) {
                        VStack(spacing: 8) {
                            Text(cat.emoji)
                                .font(.title)
                            Text(cat.name)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.primary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(appState.currentTheme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
                    }
                }
            }
        }
    }

    // MARK: - Recent Searches

    private var recentSearches: some View {
        Group {
            if !appState.recentSearches.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Searches")
                        .font(.headline)

                    ForEach(appState.recentSearches.prefix(5), id: \.self) { query in
                        Button(action: { searchText = query; performSearch() }) {
                            HStack {
                                Image(systemName: "clock.arrow.circlepath")
                                    .foregroundStyle(.secondary)
                                Text(query)
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                            .padding(.vertical, 8)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Searching...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(40)
    }

    // MARK: - Actions

    private func performSearch() {
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        guard let storeId = appState.selectedStore?.id else { return }

        isSearching = true
        hasSearched = true
        appState.addRecentSearch(searchText)

        Task {
            do {
                let response = try await APIService.shared.search(
                    query: searchText,
                    storeId: storeId
                )
                withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                    results = response.results
                    deals = response.deals
                }
            } catch {
                results = []
                deals = []
            }
            isSearching = false
        }
    }
}

// MARK: - Search Result Card

struct SearchResultCard: View {
    let result: SearchResult
    let theme: ChainTheme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header: Aisle number + confidence
            HStack {
                if let aisle = result.aisle {
                    Text("Aisle \(aisle)")
                        .font(.system(.title, design: .rounded, weight: .bold))
                        .foregroundStyle(theme.primary)
                }
                Spacer()
                confidenceBadge
            }

            // Department
            if let dept = result.department {
                Label(dept, systemImage: "building.2")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Reasoning (for AI-inferred results)
            if let reasoning = result.reasoning {
                Text(reasoning)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            }

            // Source + temporary indicator
            HStack {
                Text(result.source == "ai_inference" ? "🤖 AI Inferred" : "✅ Verified")
                    .font(.caption2.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(result.source == "ai_inference" ? Color.blue.opacity(0.1) : Color.green.opacity(0.1))
                    .clipShape(Capsule())

                if result.isTemporary {
                    Text("📍 Temporary Location")
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.1))
                        .clipShape(Capsule())
                }

                if result.verifiedCount > 0 {
                    Text("👍 \(result.verifiedCount)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Feedback buttons
                Button("✓") {}
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.green)
                Button("✗") {}
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.red)
            }
        }
        .padding()
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.06), radius: 10, y: 5)
    }

    private var confidenceBadge: some View {
        HStack(spacing: 4) {
            Text(result.confidenceLevel.emoji)
            Text("\(Int(result.confidence * 100))%")
                .font(.caption.weight(.bold))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.gray.opacity(0.1))
        .clipShape(Capsule())
    }
}

// MARK: - Deal Card

struct DealCard: View {
    let deal: Deal
    let theme: ChainTheme

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(deal.productName)
                    .font(.subheadline.weight(.medium))
                if let discount = deal.discountText {
                    Text(discount)
                        .font(.caption)
                        .foregroundStyle(theme.primary)
                        .fontWeight(.bold)
                }
                if let hint = deal.placementHint {
                    Text("📍 \(hint)")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let price = deal.salePrice {
                Text("$\(String(format: "%.2f", price))")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(theme.primary)
            }
            if deal.isDigitalCoupon {
                Image(systemName: "qrcode")
                    .foregroundStyle(theme.accent)
            }
        }
        .padding()
        .background(theme.primary.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Quick Category Model

struct CategoryItem: Identifiable {
    let id = UUID()
    let name: String
    let emoji: String

    static let quickCategories: [CategoryItem] = [
        .init(name: "Produce", emoji: "🥬"),
        .init(name: "Dairy", emoji: "🥛"),
        .init(name: "Meat", emoji: "🥩"),
        .init(name: "Frozen", emoji: "🧊"),
        .init(name: "Bakery", emoji: "🍞"),
        .init(name: "Snacks", emoji: "🍿"),
        .init(name: "Drinks", emoji: "🥤"),
        .init(name: "Cleaning", emoji: "🧹"),
        .init(name: "Baby", emoji: "👶"),
        .init(name: "Pet", emoji: "🐾"),
        .init(name: "Health", emoji: "💊"),
        .init(name: "Pharmacy", emoji: "⚕️"),
    ]
}
