"""
WhereIsIt — Hy-Vee Weekly Ad Crawler
=====================================
Crawls public Hy-Vee deals pages and extracts structured deal data.
This data feeds into the Weekly Ad Agent for AI-powered parsing.

Usage:
  python crawl_hyvee.py

All data is public (no login required). Respects robots.txt and rate limits.
"""

import httpx
import json
import time
import os
from datetime import datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

# Configuration
HYVEE_BASE = "https://www.hy-vee.com"
HYVEE_DEALS_URL = f"{HYVEE_BASE}/deals"
BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
USER_AGENT = "WhereIsIt/1.0 (Product Finder App; contact@whereisit.app)"
REQUEST_DELAY = 2  # seconds between requests (polite crawling)

# Ensure output dir exists
os.makedirs(OUTPUT_DIR, exist_ok=True)


def fetch_page(url: str) -> str | None:
    """Fetch a page with polite headers and rate limiting."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        time.sleep(REQUEST_DELAY)
        resp = httpx.get(url, headers=headers, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPError as e:
        print(f"  ❌ Failed to fetch {url}: {e}")
        return None


def search_brave(query: str) -> list[dict]:
    """
    Use Brave Search API to find deal/product pages.
    Falls back gracefully if API key not set.
    """
    if not BRAVE_API_KEY:
        print("  ⚠️  Brave Search API key not set, skipping web search")
        return []

    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
    }
    params = {
        "q": query,
        "count": 10,
        "freshness": "pw",  # past week
    }
    try:
        resp = httpx.get("https://api.search.brave.com/res/v1/web/search",
                         headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("web", {}).get("results", [])
    except Exception as e:
        print(f"  ❌ Brave Search failed: {e}")
        return []


def parse_hyvee_deals_page(html: str) -> list[dict]:
    """Extract deal information from Hy-Vee deals page HTML."""
    soup = BeautifulSoup(html, "html.parser")
    deals = []

    # Look for deal cards/items — Hy-Vee's page structure may vary
    # This is a general extraction pattern
    for item in soup.select("[data-testid*='deal'], .deal-card, .product-card, .weekly-ad-item"):
        deal = {}
        # Try to find product name
        name_el = item.select_one("h2, h3, .product-name, .deal-title, [class*='name']")
        if name_el:
            deal["product_name"] = name_el.get_text(strip=True)

        # Try to find price
        price_el = item.select_one(".price, .sale-price, [class*='price']")
        if price_el:
            price_text = price_el.get_text(strip=True)
            deal["price_text"] = price_text
            # Try to extract numeric price
            import re
            price_match = re.search(r'\$?([\d]+\.[\d]{2})', price_text)
            if price_match:
                deal["sale_price"] = float(price_match.group(1))

        # Try to find discount info
        discount_el = item.select_one(".discount, .savings, [class*='save']")
        if discount_el:
            deal["discount_text"] = discount_el.get_text(strip=True)

        # Try to find image
        img_el = item.select_one("img")
        if img_el and img_el.get("src"):
            deal["image_url"] = img_el["src"]

        if deal.get("product_name"):
            deals.append(deal)

    return deals


def extract_text_content(html: str) -> str:
    """Extract all meaningful text from a deals page for AI agent processing."""
    soup = BeautifulSoup(html, "html.parser")
    # Remove scripts and styles
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    # Remove excessive blank lines
    lines = [line for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


def save_output(filename: str, data):
    """Save crawled data as JSON."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)
    print(f"  💾 Saved to {filepath}")


def main():
    print("🔍 WhereIsIt — Hy-Vee Weekly Ad Crawler")
    print(f"   Timestamp: {datetime.now().isoformat()}")
    print(f"   Target: {HYVEE_DEALS_URL}")
    print()

    # Step 1: Fetch the main deals page
    print("📥 Fetching Hy-Vee deals page...")
    html = fetch_page(HYVEE_DEALS_URL)

    if html:
        # Step 2: Parse structured deals
        print("📊 Parsing deal cards...")
        deals = parse_hyvee_deals_page(html)
        print(f"   Found {len(deals)} deals from HTML parsing")

        # Step 3: Extract raw text for AI agent processing
        print("📝 Extracting text content for AI agent...")
        text_content = extract_text_content(html)
        print(f"   Extracted {len(text_content)} chars of text")

        # Save results
        save_output(f"hyvee_deals_{datetime.now().strftime('%Y%m%d')}.json", {
            "chain": "Hy-Vee",
            "crawled_at": datetime.now().isoformat(),
            "source_url": HYVEE_DEALS_URL,
            "deals_parsed": deals,
            "raw_text_for_agent": text_content[:15000],  # Cap for API limits
        })
    else:
        print("   ⚠️  Could not fetch deals page directly")

    # Step 4: Use Brave Search to find additional weekly ad content
    print("\n🔎 Searching Brave for Hy-Vee weekly ad data...")
    search_results = search_brave("Hy-Vee weekly ad deals this week")

    if search_results:
        print(f"   Found {len(search_results)} results from Brave Search")
        relevant = []
        for result in search_results:
            relevant.append({
                "title": result.get("title"),
                "url": result.get("url"),
                "description": result.get("description"),
            })
        save_output(f"hyvee_brave_results_{datetime.now().strftime('%Y%m%d')}.json", {
            "chain": "Hy-Vee",
            "query": "Hy-Vee weekly ad deals this week",
            "results": relevant,
        })

    print("\n✅ Hy-Vee crawl complete!")
    print("   Next: Feed output to Weekly Ad Agent via POST /api/v1/agents/parse-weekly-ad")


if __name__ == "__main__":
    main()
