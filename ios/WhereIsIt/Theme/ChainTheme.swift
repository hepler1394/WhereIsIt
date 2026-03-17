import SwiftUI

/// Chain-specific visual theme that matches retail branding.
/// Loaded dynamically when the user selects a store.
struct ChainTheme {
    let primary: Color
    let secondary: Color
    let accent: Color
    let background: Color
    let cardBackground: Color
    let chainSlug: String

    static let `default` = ChainTheme(
        primary: Color(hex: "4A90D9"),
        secondary: Color(hex: "333333"),
        accent: Color(hex: "4A90D9"),
        background: Color(hex: "F5F7FA"),
        cardBackground: .white,
        chainSlug: "default"
    )

    // ═══════════════════════════════════════
    // Pre-built themes for major chains
    // ═══════════════════════════════════════

    static let themes: [String: ChainTheme] = [
        "hyvee": ChainTheme(
            primary: Color(hex: "E31837"),
            secondary: Color(hex: "000000"),
            accent: Color(hex: "FFD700"),
            background: Color(hex: "FFF8F0"),
            cardBackground: .white,
            chainSlug: "hyvee"
        ),
        "walmart": ChainTheme(
            primary: Color(hex: "0071CE"),
            secondary: Color(hex: "FFC220"),
            accent: Color(hex: "007DC6"),
            background: Color(hex: "F0F4F8"),
            cardBackground: .white,
            chainSlug: "walmart"
        ),
        "target": ChainTheme(
            primary: Color(hex: "CC0000"),
            secondary: Color(hex: "333333"),
            accent: Color(hex: "CC0000"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "target"
        ),
        "costco": ChainTheme(
            primary: Color(hex: "E31837"),
            secondary: Color(hex: "005DAA"),
            accent: Color(hex: "005DAA"),
            background: Color(hex: "F0F4F8"),
            cardBackground: .white,
            chainSlug: "costco"
        ),
        "sams-club": ChainTheme(
            primary: Color(hex: "0060A9"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "78BE20"),
            background: Color(hex: "F0F5FA"),
            cardBackground: .white,
            chainSlug: "sams-club"
        ),
        "kroger": ChainTheme(
            primary: Color(hex: "E35205"),
            secondary: Color(hex: "1E3264"),
            accent: Color(hex: "E35205"),
            background: Color(hex: "FFF5F0"),
            cardBackground: .white,
            chainSlug: "kroger"
        ),
        "aldi": ChainTheme(
            primary: Color(hex: "00457C"),
            secondary: Color(hex: "F47B20"),
            accent: Color(hex: "F47B20"),
            background: Color(hex: "F0F5FA"),
            cardBackground: .white,
            chainSlug: "aldi"
        ),
        "publix": ChainTheme(
            primary: Color(hex: "3B7D23"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "3B7D23"),
            background: Color(hex: "F0F8F0"),
            cardBackground: .white,
            chainSlug: "publix"
        ),
        "heb": ChainTheme(
            primary: Color(hex: "EE3A43"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "EE3A43"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "heb"
        ),
        "whole-foods": ChainTheme(
            primary: Color(hex: "00674B"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "00674B"),
            background: Color(hex: "F0F8F5"),
            cardBackground: .white,
            chainSlug: "whole-foods"
        ),
        "trader-joes": ChainTheme(
            primary: Color(hex: "BA1F31"),
            secondary: Color(hex: "006747"),
            accent: Color(hex: "006747"),
            background: Color(hex: "FFF8F5"),
            cardBackground: .white,
            chainSlug: "trader-joes"
        ),
        "meijer": ChainTheme(
            primary: Color(hex: "D0112B"),
            secondary: Color(hex: "1C3F7A"),
            accent: Color(hex: "D0112B"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "meijer"
        ),
        "price-chopper": ChainTheme(
            primary: Color(hex: "D4212A"),
            secondary: Color(hex: "1B3C6D"),
            accent: Color(hex: "F5A623"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "price-chopper"
        ),
        "wegmans": ChainTheme(
            primary: Color(hex: "045C2F"),
            secondary: Color(hex: "000000"),
            accent: Color(hex: "045C2F"),
            background: Color(hex: "F0F8F2"),
            cardBackground: .white,
            chainSlug: "wegmans"
        ),
        "safeway": ChainTheme(
            primary: Color(hex: "D31145"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "D31145"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "safeway"
        ),
        "walgreens": ChainTheme(
            primary: Color(hex: "E31837"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "E31837"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "walgreens"
        ),
        "cvs": ChainTheme(
            primary: Color(hex: "CC0000"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "CC0000"),
            background: Color(hex: "FFF5F5"),
            cardBackground: .white,
            chainSlug: "cvs"
        ),
        "dollar-general": ChainTheme(
            primary: Color(hex: "FFC220"),
            secondary: Color(hex: "000000"),
            accent: Color(hex: "FFC220"),
            background: Color(hex: "FFFDF0"),
            cardBackground: .white,
            chainSlug: "dollar-general"
        ),
        "albertsons": ChainTheme(
            primary: Color(hex: "0073CF"),
            secondary: Color(hex: "FFFFFF"),
            accent: Color(hex: "0073CF"),
            background: Color(hex: "F0F5FA"),
            cardBackground: .white,
            chainSlug: "albertsons"
        ),
    ]

    static func forChain(_ slug: String?) -> ChainTheme? {
        guard let slug else { return nil }
        return themes[slug]
    }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
