import SwiftUI

// MARK: - Deals View

struct DealsView: View {
    @EnvironmentObject var appState: AppState
    @State private var deals: [Deal] = []
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ZStack {
                appState.currentTheme.background.ignoresSafeArea()
                
                ScrollView {
                    if isLoading {
                        ProgressView().padding(60)
                    } else if deals.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(deals) { deal in
                                DealCard(deal: deal, theme: appState.currentTheme)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Deals")
            .task { await loadDeals() }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "tag.slash").font(.system(size: 48)).foregroundStyle(.secondary)
            Text("No deals available").font(.headline)
            Text("Weekly deals will appear here once your store's ads are crawled.")
                .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .padding(60)
    }

    private func loadDeals() async {
        isLoading = true
        defer { isLoading = false }
        do {
            deals = try await APIService.shared.getDeals(
                storeId: appState.selectedStore?.id,
                chainId: appState.selectedStore?.chainId
            )
        } catch { deals = [] }
    }
}

// MARK: - Community View

struct CommunityView: View {
    @EnvironmentObject var appState: AppState
    @State private var productName = ""
    @State private var aisleNumber = ""
    @State private var department = ""
    @State private var showSubmitResult = false
    @State private var submitSuccess = false

    var body: some View {
        NavigationStack {
            ZStack {
                appState.currentTheme.background.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Submit section
                        VStack(alignment: .leading, spacing: 16) {
                            Label("Report a Product Location", systemImage: "plus.circle.fill")
                                .font(.headline)
                                .foregroundStyle(appState.currentTheme.primary)

                            TextField("Product name", text: $productName)
                                .textFieldStyle(.roundedBorder)
                            TextField("Aisle number", text: $aisleNumber)
                                .textFieldStyle(.roundedBorder)
                                .keyboardType(.numberPad)
                            TextField("Department (optional)", text: $department)
                                .textFieldStyle(.roundedBorder)

                            Button(action: submitLocation) {
                                HStack {
                                    Image(systemName: "paperplane.fill")
                                    Text("Submit")
                                }
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(appState.currentTheme.primary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .disabled(productName.isEmpty || aisleNumber.isEmpty)

                            Text("Your submission is instantly reviewed by our AI moderation agent — no waiting for human review!")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)

                        // How it works
                        VStack(alignment: .leading, spacing: 12) {
                            Text("How Community Works")
                                .font(.headline)
                            communityStep("1", "Submit a product location you find in-store")
                            communityStep("2", "AI Agent reviews it instantly — no delays")
                            communityStep("3", "Your data helps other shoppers find things faster")
                            communityStep("4", "Earn reputation and unlock trusted contributor status")
                        }
                        .padding()
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
                    }
                    .padding()
                }
            }
            .navigationTitle("Community")
            .alert(submitSuccess ? "Submitted!" : "Error", isPresented: $showSubmitResult) {
                Button("OK") {}
            } message: {
                Text(submitSuccess
                     ? "Your location report was submitted and auto-reviewed by our AI agent."
                     : "Something went wrong. Please try again.")
            }
        }
    }

    private func communityStep(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 24, height: 24)
                .background(appState.currentTheme.primary)
                .clipShape(Circle())
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func submitLocation() {
        guard let storeId = appState.selectedStore?.id else { return }
        Task {
            do {
                let _ = try await APIService.shared.submitLocation(
                    productName: productName,
                    aisleNumber: aisleNumber,
                    department: department.isEmpty ? nil : department,
                    storeId: storeId,
                    userId: appState.currentUser?.id
                )
                submitSuccess = true
                productName = ""
                aisleNumber = ""
                department = ""
            } catch {
                submitSuccess = false
            }
            showSubmitResult = true
        }
    }
}

// MARK: - Profile View

struct ProfileView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            ZStack {
                appState.currentTheme.background.ignoresSafeArea()
                
                List {
                    Section("Account") {
                        if let user = appState.currentUser {
                            HStack {
                                Image(systemName: "person.circle.fill")
                                    .font(.title)
                                    .foregroundStyle(appState.currentTheme.primary)
                                VStack(alignment: .leading) {
                                    Text(user.displayName ?? "User")
                                        .font(.headline)
                                    Text("Trust Level \(user.trustLevel) • \(user.contributionsCount) contributions")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        } else {
                            Button("Sign In") { /* TODO */ }
                        }
                    }

                    Section("Subscription") {
                        HStack {
                            Text("Current Plan")
                            Spacer()
                            Text(appState.subscriptionTier.rawValue.capitalized)
                                .foregroundStyle(.secondary)
                        }
                        if appState.subscriptionTier == .free {
                            Button("Upgrade to Premium") { /* TODO: Show paywall */ }
                                .foregroundStyle(appState.currentTheme.primary)
                        }
                    }

                    Section("Preferences") {
                        NavigationLink("Favorite Stores") { Text("Coming soon") }
                        NavigationLink("Notifications") { Text("Coming soon") }
                        Toggle("Dark Mode", isOn: Binding(
                            get: { appState.colorScheme == .dark },
                            set: { appState.colorScheme = $0 ? .dark : .light }
                        ))
                    }

                    Section("About") {
                        HStack { Text("Version"); Spacer(); Text("1.0.0").foregroundStyle(.secondary) }
                        Link("Privacy Policy", destination: URL(string: "https://whereisit.app/privacy")!)
                        Link("Terms of Service", destination: URL(string: "https://whereisit.app/terms")!)
                    }
                }
            }
            .navigationTitle("Profile")
        }
    }
}
