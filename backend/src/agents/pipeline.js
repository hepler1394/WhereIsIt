/**
 * WhereIsIt Agent Pipeline System
 * ================================
 * Each agent is an autonomous AI-powered worker with:
 *   - A specific role and goal
 *   - A system prompt defining its behavior
 *   - Input/output schemas
 *   - Confidence thresholds for auto-approve vs escalation
 *
 * Agents replace the need for human employees for:
 *   - Community submission moderation
 *   - Data quality assurance
 *   - Store layout processing
 *   - Weekly ad parsing
 *   - Category inference
 *   - Content safety screening
 */

import { inferJSON, inferWithImage } from '../services/gemini.js';

// Confidence thresholds from env
const AUTO_APPROVE = parseFloat(process.env.AGENT_AUTO_APPROVE_THRESHOLD || '0.85');
const ESCALATE = parseFloat(process.env.AGENT_ESCALATE_THRESHOLD || '0.5');

/**
 * Base agent execution wrapper.
 * Every agent call returns a standard decision envelope.
 */
function makeDecision(agentName, confidence, action, data, reasoning) {
  const decision = {
    agent: agentName,
    confidence,
    action, // 'approve' | 'reject' | 'escalate' | 'process'
    data,
    reasoning,
    timestamp: new Date().toISOString(),
    auto_approved: confidence >= AUTO_APPROVE,
    needs_review: confidence < ESCALATE,
  };

  console.log(`🤖 [${agentName}] ${action} (confidence: ${(confidence * 100).toFixed(0)}%) — ${reasoning}`);
  return decision;
}

// ═══════════════════════════════════════════════════════
// AGENT 1: Moderation Agent
// Reviews community submissions for accuracy and spam
// ═══════════════════════════════════════════════════════

const MODERATION_SYSTEM_PROMPT = `You are the WhereIsIt Moderation Agent. Your job is to review community-submitted product location reports from retail store shoppers.

You receive a submission containing:
- product_name: what the user says they found
- aisle_number: which aisle they report
- department: which department
- store_name: the store location
- user_trust_level: 0-4 (higher = more trusted)
- optional photo evidence

Your task:
1. Assess if this submission is plausible and not spam
2. Check if the product logically belongs in the reported department/aisle
3. Assign a confidence score (0.0-1.0) for how likely this is accurate
4. Decide: approve, reject, or escalate for human review

Respond with JSON:
{
  "confidence": 0.0-1.0,
  "action": "approve" | "reject" | "escalate",
  "reasoning": "brief explanation",
  "suggested_category": "if you can infer the product category",
  "spam_detected": true | false,
  "flags": ["list", "of", "concerns"]
}

Rules:
- Trust level 3+ users: bias toward approval unless obviously wrong
- Trust level 0 users: be more skeptical  
- If product doesn't logically fit the aisle (e.g., "shampoo in frozen foods"), flag it
- If the submission looks like spam or vandalism, reject immediately
- If you're unsure, escalate rather than approving bad data`;

export async function runModerationAgent(submission) {
  const prompt = `Review this product location submission:
Product: "${submission.product_name}"
Aisle: ${submission.aisle_number}
Department: ${submission.department || 'not specified'}
Store: ${submission.store_name}
User Trust Level: ${submission.user_trust_level || 0}
Additional Notes: ${submission.notes || 'none'}`;

  const result = await inferJSON(MODERATION_SYSTEM_PROMPT, prompt);
  if (!result) return makeDecision('ModerationAgent', 0.0, 'escalate', submission, 'AI inference failed — escalating for safety');

  return makeDecision(
    'ModerationAgent',
    result.confidence,
    result.action,
    { ...submission, agent_analysis: result },
    result.reasoning
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 2: Category Inference Agent
// Maps unknown products to likely store categories/aisles
// ═══════════════════════════════════════════════════════

const CATEGORY_INFERENCE_SYSTEM_PROMPT = `You are the WhereIsIt Category Inference Agent. When a user searches for a product and no exact match exists in the database, you infer where it most likely is.

You receive:
- product_query: what the user is searching for
- store_aisles: list of known aisle labels/categories at this specific store
- chain_name: the retail chain (e.g., Hy-Vee, Walmart, Target)

Your task:
1. Determine the most likely product category
2. Match it to the most probable aisle(s) from the store's known aisles
3. Consider chain-specific patterns (e.g., Hy-Vee often has "Health Market" sections)
4. Provide confidence and reasoning

Respond with JSON:
{
  "primary_match": {
    "aisle": "aisle label or number",
    "department": "department name",
    "confidence": 0.0-1.0,
    "reasoning": "why this aisle"
  },
  "alternate_matches": [
    {
      "aisle": "another possible aisle",
      "department": "department",
      "confidence": 0.0-1.0,
      "reasoning": "why this could also work"
    }
  ],
  "product_category": "inferred category name",
  "is_seasonal": false,
  "might_be_on_endcap": false,
  "chain_specific_notes": "any chain-specific insight"
}

Chain-specific knowledge:
- Hy-Vee: Has "Health Market" for natural/organic, "Fuel Saver" deals, full-service departments
- Walmart: Supercenter layout with grocery + general merchandise, "Action Alley" for promotions
- Target: Smaller grocery footprint, "Market" section, Circle offers
- Costco: Warehouse format, no aisle signs, products move locations frequently
- Sam's Club: Similar to Costco with membership, "Scan & Go" feature`;

export async function runCategoryInferenceAgent(productQuery, storeAisles, chainName) {
  const prompt = `Find the most likely location for this product:
Product: "${productQuery}"
Chain: ${chainName}
Store Aisles: ${JSON.stringify(storeAisles)}`;

  const result = await inferJSON(CATEGORY_INFERENCE_SYSTEM_PROMPT, prompt);
  if (!result) {
    return makeDecision('CategoryInferenceAgent', 0.0, 'escalate',
      { productQuery, chainName }, 'AI inference failed');
  }

  return makeDecision(
    'CategoryInferenceAgent',
    result.primary_match?.confidence || 0.5,
    'process',
    result,
    result.primary_match?.reasoning || 'Category inference completed'
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 3: Store Layout Agent
// Processes aisle sign photos → structured aisle/category data
// ═══════════════════════════════════════════════════════

const STORE_LAYOUT_SYSTEM_PROMPT = `You are the WhereIsIt Store Layout Agent. You process photos of retail store aisle signs and extract structured category data.

When given a photo of an aisle sign, you must:
1. Read all text on the sign
2. Identify the aisle number (if visible)
3. Extract all product categories listed
4. Note which side of the aisle each category is on (if split aisle)
5. Identify any sub-categories or specific product types mentioned

Respond with JSON:
{
  "aisle_number": "7" or null if not visible,
  "categories_side_a": ["category1", "category2"],
  "categories_side_b": ["category3", "category4"],
  "all_categories": ["category1", "category2", "category3", "category4"],
  "sign_text_raw": "exact text from the sign",
  "confidence": 0.0-1.0,
  "notes": "any observations about the sign or layout",
  "is_endcap": false,
  "is_special_section": false,
  "special_section_type": null
}

Tips:
- Aisle signs often have categories listed vertically
- Some stores use color coding — note colors if visible
- Split aisles list different categories on each side
- Endcap signs indicate temporary promotional placement
- Some stores have section headers (Frozen, Dairy, Bakery) instead of aisle numbers`;

export async function runStoreLayoutAgent(imageBuffer, mimeType, storeContext = {}) {
  const prompt = `Extract aisle information from this store aisle sign photo.
Store: ${storeContext.store_name || 'Unknown'}
Chain: ${storeContext.chain_name || 'Unknown'}
Additional context: ${storeContext.notes || 'none'}`;

  const result = await inferWithImage(STORE_LAYOUT_SYSTEM_PROMPT, prompt, imageBuffer, mimeType);
  if (!result) {
    return makeDecision('StoreLayoutAgent', 0.0, 'escalate',
      { storeContext }, 'Vision inference failed');
  }

  return makeDecision(
    'StoreLayoutAgent',
    result.confidence || 0.7,
    'process',
    result,
    `Extracted ${result.all_categories?.length || 0} categories from aisle ${result.aisle_number || '?'}`
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 4: Weekly Ad Agent
// Parses weekly ad content → structured deals data
// ═══════════════════════════════════════════════════════

const WEEKLY_AD_SYSTEM_PROMPT = `You are the WhereIsIt Weekly Ad Agent. You parse retail weekly advertisement content (text from crawled pages, or image descriptions) and extract structured deal information.

From weekly ad content, extract:
1. Product names on sale
2. Sale prices and original prices (if shown)
3. Discount amounts or percentages
4. Sale date ranges
5. Any placement hints (e.g., "front of store," "endcap," "in-store only")
6. Digital coupon indicators
7. Loyalty program requirements (e.g., "Fuel Saver price," "Circle offer")

Respond with JSON:
{
  "deals": [
    {
      "product_name": "product name",
      "brand": "brand name or null",
      "sale_price": 2.99,
      "regular_price": 3.99,
      "discount_text": "$1.00 off" or "25% off",
      "requires_loyalty": true,
      "loyalty_program": "Fuel Saver",
      "is_digital_coupon": false,
      "placement_hint": "endcap" or null,
      "category_guess": "Snacks",
      "start_date": "2026-03-15" or null,
      "end_date": "2026-03-21" or null
    }
  ],
  "ad_valid_dates": { "start": "date", "end": "date" },
  "chain": "chain name",
  "total_deals_found": 15
}`;

export async function runWeeklyAdAgent(adContent, chainName) {
  const prompt = `Parse this weekly advertisement content and extract all deals:
Chain: ${chainName}
Ad Content:
${adContent.substring(0, 10000)}`; // Limit to 10K chars to stay within token budget

  const result = await inferJSON(WEEKLY_AD_SYSTEM_PROMPT, prompt);
  if (!result) {
    return makeDecision('WeeklyAdAgent', 0.0, 'escalate',
      { chainName }, 'Ad parsing failed');
  }

  return makeDecision(
    'WeeklyAdAgent',
    0.8, // Ad parsing is generally reliable
    'process',
    result,
    `Extracted ${result.total_deals_found || result.deals?.length || 0} deals from ${chainName} ad`
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 5: Data Quality Agent
// Audits existing data for staleness, conflicts, errors
// ═══════════════════════════════════════════════════════

const DATA_QUALITY_SYSTEM_PROMPT = `You are the WhereIsIt Data Quality Agent. You audit product location data for quality issues.

You receive a batch of product location records and must:
1. Flag records that seem implausible (wrong category for aisle)
2. Identify stale data (old records with low verification counts)
3. Detect conflicts (same product, different reported aisles)
4. Suggest records that should be re-verified
5. Identify patterns that suggest a store may have been reorganized

Respond with JSON:
{
  "total_reviewed": 50,
  "issues_found": [
    {
      "record_id": "id",
      "issue_type": "implausible" | "stale" | "conflict" | "needs_reverify",
      "severity": "low" | "medium" | "high",
      "description": "what's wrong",
      "suggested_action": "delete" | "flag" | "merge" | "reverify"
    }
  ],
  "store_reorganization_detected": false,
  "overall_quality_score": 0.0-1.0
}`;

export async function runDataQualityAgent(records, storeContext) {
  const prompt = `Audit these product location records for quality:
Store: ${storeContext.store_name} (${storeContext.chain_name})
Records (${records.length} total):
${JSON.stringify(records.slice(0, 50), null, 2)}`;

  const result = await inferJSON(DATA_QUALITY_SYSTEM_PROMPT, prompt);
  if (!result) {
    return makeDecision('DataQualityAgent', 0.0, 'escalate',
      { storeContext }, 'Quality audit failed');
  }

  return makeDecision(
    'DataQualityAgent',
    result.overall_quality_score || 0.5,
    'process',
    result,
    `Found ${result.issues_found?.length || 0} issues in ${result.total_reviewed || 0} records`
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 6: Content Safety Agent
// Screens uploaded photos for inappropriate content
// ═══════════════════════════════════════════════════════

const CONTENT_SAFETY_SYSTEM_PROMPT = `You are the WhereIsIt Content Safety Agent. You screen user-uploaded photos to ensure they are appropriate for a retail product finding app.

Acceptable photos:
- Aisle signs
- Store layouts/maps
- Product shelves
- Store directories
- Store exterior/interior shots
- Weekly ad flyers
- Product packaging

Unacceptable photos:
- Inappropriate or NSFW content
- Photos of people (privacy concern)
- Unrelated images (memes, screenshots of other apps)
- Blurry/unusable images
- Photos with visible personal information

Respond with JSON:
{
  "is_safe": true | false,
  "is_relevant": true | false,
  "content_type": "aisle_sign" | "store_layout" | "product_shelf" | "weekly_ad" | "store_exterior" | "other" | "inappropriate",
  "confidence": 0.0-1.0,
  "flags": ["list of concerns if any"],
  "usable_for_data": true | false
}`;

export async function runContentSafetyAgent(imageBuffer, mimeType) {
  const prompt = 'Is this photo appropriate and relevant for a retail store product finding app? Classify it.';

  const result = await inferWithImage(CONTENT_SAFETY_SYSTEM_PROMPT, prompt, imageBuffer, mimeType);
  if (!result) {
    return makeDecision('ContentSafetyAgent', 0.0, 'escalate', {}, 'Safety check failed');
  }

  const action = result.is_safe && result.is_relevant ? 'approve' : 'reject';
  return makeDecision(
    'ContentSafetyAgent',
    result.confidence || 0.5,
    action,
    result,
    result.is_safe ? `Safe ${result.content_type} image` : `Rejected: ${result.flags?.join(', ') || 'unsafe/irrelevant'}`
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 7: Store Onboarding Agent
// Validates and enriches new store submissions
// ═══════════════════════════════════════════════════════

const STORE_ONBOARDING_SYSTEM_PROMPT = `You are the WhereIsIt Store Onboarding Agent. When a new store is added to the system, you validate it and enrich the data.

Given a store name, address, and chain, you should:
1. Verify the chain name is a real retail chain
2. Infer store format (grocery, supercenter, warehouse, convenience, pharmacy)
3. Predict common departments for this chain
4. Suggest a default aisle layout template based on the chain
5. Note any chain-specific features (pharmacy, bakery, deli, gas station, etc.)

Respond with JSON:
{
  "is_valid": true,
  "chain_verified": true,
  "store_format": "grocery" | "supercenter" | "warehouse" | "convenience" | "pharmacy" | "department",
  "predicted_departments": ["Produce", "Dairy", "Frozen", ...],
  "chain_features": {
    "has_pharmacy": true,
    "has_bakery": true,
    "has_deli": true,
    "has_gas_station": true,
    "has_online_ordering": true,
    "loyalty_program": "Fuel Saver + Perks"
  },
  "default_aisle_template": "hyvee_standard" | "walmart_supercenter" | "target_standard" | "generic",
  "confidence": 0.0-1.0
}`;

export async function runStoreOnboardingAgent(storeName, address, chainName) {
  const prompt = `Validate and enrich this new store:
Store Name: ${storeName}
Address: ${address}
Chain: ${chainName}`;

  const result = await inferJSON(STORE_ONBOARDING_SYSTEM_PROMPT, prompt);
  if (!result) {
    return makeDecision('StoreOnboardingAgent', 0.0, 'escalate',
      { storeName, chainName }, 'Store validation failed');
  }

  return makeDecision(
    'StoreOnboardingAgent',
    result.confidence || 0.7,
    result.is_valid ? 'approve' : 'reject',
    result,
    `${chainName} ${result.store_format || 'store'} — ${result.predicted_departments?.length || 0} departments predicted`
  );
}

// ═══════════════════════════════════════════════════════
// AGENT 8: Price Monitor Agent
// Searches for public pricing data using Brave Search
// ═══════════════════════════════════════════════════════

const PRICE_ANALYSIS_SYSTEM_PROMPT = `You are the WhereIsIt Price Monitor Agent. Given search results about product pricing from various retailers, extract and compare prices.

Respond with JSON:
{
  "product": "product name",
  "prices": [
    {
      "retailer": "store name",
      "price": 3.99,
      "unit_price": "per oz or per count if available",
      "is_sale_price": false,
      "source_url": "url",
      "confidence": 0.0-1.0
    }
  ],
  "best_deal": {
    "retailer": "cheapest store",
    "price": 2.99,
    "savings_vs_average": "$0.50"
  },
  "price_range": { "low": 2.99, "high": 4.99 },
  "data_freshness": "today" | "this_week" | "uncertain"
}`;

export async function runPriceMonitorAgent(productName, searchResults) {
  const prompt = `Analyze pricing for "${productName}" from these search results:
${searchResults.substring(0, 8000)}`;

  const result = await inferJSON(PRICE_ANALYSIS_SYSTEM_PROMPT, prompt);
  if (!result) {
    return makeDecision('PriceMonitorAgent', 0.0, 'escalate',
      { productName }, 'Price analysis failed');
  }

  return makeDecision(
    'PriceMonitorAgent',
    0.7,
    'process',
    result,
    `Found ${result.prices?.length || 0} prices for ${productName}`
  );
}

// ═══════════════════════════════════════════════════════
// Export all agents
// ═══════════════════════════════════════════════════════

export const Agents = {
  moderation: runModerationAgent,
  categoryInference: runCategoryInferenceAgent,
  storeLayout: runStoreLayoutAgent,
  weeklyAd: runWeeklyAdAgent,
  dataQuality: runDataQualityAgent,
  contentSafety: runContentSafetyAgent,
  storeOnboarding: runStoreOnboardingAgent,
  priceMonitor: runPriceMonitorAgent,
};
