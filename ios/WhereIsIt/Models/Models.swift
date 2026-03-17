import Foundation

// MARK: - Data Models

struct Store: Identifiable, Codable, Hashable {
    let id: String
    let chainId: String?
    let name: String
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let lat: Double?
    let lng: Double?
    let storeFormat: String?
    let hasPharmacy: Bool?
    let hasBakery: Bool?
    let hasDeli: Bool?
    let chainSlug: String?
    let chainName: String?
    let chainPrimaryColor: String?
    var distanceMiles: Double?

    enum CodingKeys: String, CodingKey {
        case id, name, address, city, state, zip, lat, lng
        case chainId = "chain_id"
        case storeFormat = "store_format"
        case hasPharmacy = "has_pharmacy"
        case hasBakery = "has_bakery"
        case hasDeli = "has_deli"
        case distanceMiles = "distance_miles"
        case chainSlug, chainName, chainPrimaryColor
    }
}

struct SearchResult: Identifiable, Codable {
    let id = UUID()
    let type: String // "exact", "inferred", "alternate"
    let confidence: Double
    let source: String
    let productName: String
    let aisle: String?
    let department: String?
    let locationDetail: String?
    let reasoning: String?
    let isTemporary: Bool
    let verifiedCount: Int

    var confidenceLevel: ConfidenceLevel {
        switch confidence {
        case 0.8...1.0: return .high
        case 0.5..<0.8: return .medium
        default: return .low
        }
    }

    enum CodingKeys: String, CodingKey {
        case type, confidence, source, aisle, department, reasoning
        case productName = "product_name"
        case locationDetail = "location_detail"
        case isTemporary = "is_temporary"
        case verifiedCount = "verified_count"
    }
}

enum ConfidenceLevel: String {
    case high = "High"
    case medium = "Medium"
    case low = "Low"

    var emoji: String {
        switch self {
        case .high: return "🟢"
        case .medium: return "🟡"
        case .low: return "🔴"
        }
    }

    var description: String {
        switch self {
        case .high: return "Verified location"
        case .medium: return "AI inference"
        case .low: return "Best guess"
        }
    }
}

struct Deal: Identifiable, Codable {
    let id = UUID()
    let productName: String
    let salePrice: Double?
    let regularPrice: Double?
    let discountText: String?
    let placementHint: String?
    let isDigitalCoupon: Bool
    let ends: String?

    enum CodingKeys: String, CodingKey {
        case productName = "product_name"
        case salePrice = "sale_price"
        case regularPrice = "regular_price"
        case discountText = "discount_text"
        case placementHint = "placement_hint"
        case isDigitalCoupon = "is_digital_coupon"
        case ends
    }
}

struct SearchResponse: Codable {
    let query: String
    let storeId: String
    let results: [SearchResult]
    let deals: [Deal]

    enum CodingKeys: String, CodingKey {
        case query, results, deals
        case storeId = "store_id"
    }
}

struct User: Identifiable, Codable {
    let id: String
    var displayName: String?
    var avatarUrl: String?
    var reputationScore: Int
    var trustLevel: Int
    var contributionsCount: Int
    var subscriptionTier: String

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
        case reputationScore = "reputation_score"
        case trustLevel = "trust_level"
        case contributionsCount = "contributions_count"
        case subscriptionTier = "subscription_tier"
    }
}

struct Aisle: Identifiable, Codable {
    let id: String
    let aisleNumber: String
    let aisleLabel: String?
    let sideACategories: [String]?
    let sideBCategories: [String]?
    let isSplit: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case aisleNumber = "aisle_number"
        case aisleLabel = "aisle_label"
        case sideACategories = "side_a_categories"
        case sideBCategories = "side_b_categories"
        case isSplit = "is_split"
    }
}
