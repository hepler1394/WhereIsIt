# WhereIsIt 🔍

**Walk into any store. Find anything. Instantly.**

WhereIsIt is an iOS app that helps shoppers find products in retail stores using AI-powered location inference, community-contributed data, and chain-specific intelligence.

## Project Structure

```
├── backend/          # Node.js (Fastify) API server
├── ios/              # SwiftUI iOS app (Xcode project)
├── crawler/          # Python web crawlers for store data
└── docs/             # Documentation and assets
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| iOS App | SwiftUI + Swift 6 |
| Backend | Node.js + Fastify |
| Database | Supabase (PostgreSQL) |
| Search | Meilisearch |
| AI | Gemini 2.5 Flash |
| Web Search | Brave Search API |
| Subscriptions | RevenueCat |
| Storage | Cloudflare R2 |

## Getting Started

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Fill in your keys
npm run dev
```

### iOS
Open `ios/WhereIsIt.xcodeproj` in Xcode and run on simulator or device.

### Crawler
```bash
cd crawler
pip install -r requirements.txt
python crawl_hyvee.py
```

## License

Proprietary — All rights reserved.
