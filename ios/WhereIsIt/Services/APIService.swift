import Foundation

/// API client for the WhereIsIt backend.
@MainActor
class APIService: ObservableObject {
    static let shared = APIService()

    private let baseURL: String
    private let decoder: JSONDecoder

    init(baseURL: String = "http://localhost:3000/api/v1") {
        self.baseURL = baseURL
        self.decoder = JSONDecoder()
    }

    // MARK: - Search

    func search(query: String, storeId: String, chainId: String? = nil) async throws -> SearchResponse {
        var body: [String: Any] = ["query": query, "store_id": storeId]
        if let chainId { body["chain_id"] = chainId }

        return try await post("/search", body: body)
    }

    // MARK: - Stores

    func nearbyStores(lat: Double, lng: Double, radiusMiles: Int = 25) async throws -> [Store] {
        struct Response: Codable { let stores: [Store] }
        let resp: Response = try await get("/stores/nearby?lat=\(lat)&lng=\(lng)&radius_miles=\(radiusMiles)")
        return resp.stores
    }

    func getStore(id: String) async throws -> Store? {
        struct Response: Codable { let store: Store? }
        let resp: Response = try await get("/stores/\(id)")
        return resp.store
    }

    func searchStores(query: String) async throws -> [Store] {
        struct Response: Codable { let stores: [Store] }
        let resp: Response = try await get("/stores/search?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)")
        return resp.stores
    }

    // MARK: - Deals

    func getDeals(storeId: String? = nil, chainId: String? = nil) async throws -> [Deal] {
        struct Response: Codable { let deals: [Deal] }
        var path = "/deals?"
        if let storeId { path += "store_id=\(storeId)&" }
        if let chainId { path += "chain_id=\(chainId)&" }
        let resp: Response = try await get(path)
        return resp.deals
    }

    // MARK: - Community

    func submitLocation(productName: String, aisleNumber: String, department: String?, storeId: String, userId: String?) async throws -> [String: Any] {
        let body: [String: Any] = [
            "product_name": productName,
            "aisle_number": aisleNumber,
            "department": department ?? "",
            "store_id": storeId,
            "user_id": userId ?? "",
        ]
        // Return raw dict since response shape varies
        return try await postRaw("/community/submit", body: body)
    }

    func confirmLocation(productLocationId: String, isCorrect: Bool, userId: String) async throws {
        let body: [String: Any] = [
            "product_location_id": productLocationId,
            "is_correct": isCorrect,
            "user_id": userId,
        ]
        let _: [String: Any] = try await postRaw("/community/confirm", body: body)
    }

    // MARK: - HTTP Helpers

    private func get<T: Codable>(_ path: String) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let httpResponse = response as? HTTPURLResponse, 200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try decoder.decode(T.self, from: data)
    }

    private func post<T: Codable>(_ path: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, 200...299 ~= httpResponse.statusCode else {
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try decoder.decode(T.self, from: data)
    }

    private func postRaw(_ path: String, body: [String: Any]) async throws -> [String: Any] {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        return (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case serverError(Int)
    case decodingError

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .serverError(let code): return "Server error (\(code))"
        case .decodingError: return "Failed to decode response"
        }
    }
}
