import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @State private var currentPage = 0

    var body: some View {
        TabView(selection: $currentPage) {
            // Page 1: Welcome
            welcomePage.tag(0)
            // Page 2: How it works
            howItWorksPage.tag(1)
            // Page 3: Get started
            getStartedPage.tag(2)
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .indexViewStyle(.page(backgroundDisplayMode: .always))
        .ignoresSafeArea()
    }

    private var welcomePage: some View {
        VStack(spacing: 30) {
            Spacer()
            Image(systemName: "magnifyingglass.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.linearGradient(
                    colors: [Color(hex: "4A90D9"), Color(hex: "7B61FF")],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                ))
                .shadow(color: Color(hex: "4A90D9").opacity(0.3), radius: 20, y: 10)

            Text("WhereIsIt")
                .font(.system(size: 42, weight: .bold, design: .rounded))
            Text("Find anything.\nAny store.\nInstantly.")
                .font(.title2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Spacer()
            nextButton
        }
        .padding(40)
    }

    private var howItWorksPage: some View {
        VStack(spacing: 30) {
            Spacer()
            VStack(alignment: .leading, spacing: 24) {
                featureRow(icon: "mappin.and.ellipse", color: .red,
                           title: "Auto-Detect Your Store",
                           description: "GPS finds the nearest stores instantly")
                featureRow(icon: "text.magnifyingglass", color: .blue,
                           title: "Search Any Product",
                           description: "Get the aisle, department, and confidence level")
                featureRow(icon: "brain.head.profile", color: .purple,
                           title: "AI-Powered Inference",
                           description: "Even without exact data, AI finds likely locations")
                featureRow(icon: "person.3.fill", color: .green,
                           title: "Community Intelligence",
                           description: "Shoppers help keep data accurate and fresh")
            }
            Spacer()
            nextButton
        }
        .padding(40)
    }

    private var getStartedPage: some View {
        VStack(spacing: 30) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.green)

            Text("You're Ready!")
                .font(.system(size: 36, weight: .bold, design: .rounded))
            Text("Choose your store and start finding products with ease.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Spacer()

            Button(action: {
                withAnimation {
                    appState.hasCompletedOnboarding = true
                }
            }) {
                Text("Get Started")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "4A90D9"))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }
        }
        .padding(40)
    }

    private func featureRow(icon: String, color: Color, title: String, description: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
                .frame(width: 44)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var nextButton: some View {
        Button(action: { withAnimation { currentPage += 1 } }) {
            HStack {
                Text("Next")
                Image(systemName: "arrow.right")
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(hex: "4A90D9"))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}
