/**
 * WhereIsIt — Search Routes (Production)
 * Full-featured search with caching, validation, analytics,
 * fuzzy matching, multi-source aggregation, and suggestions.
 */

import { Agents } from '../agents/pipeline.js';
import * as db from '../services/supabase.js';
import { searchCache, agentCache } from '../lib/cache.js';
import { sanitizeQuery } from '../lib/validators.js';
import { success, ValidationError } from '../lib/errors.js';

export async function searchRoutes(app) {

  // ══════════════════════════════════════════
  // POST /api/v1/search — Main product search
  // ══════════════════════════════════════════
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 200 },
          store_id: { type: 'string' },
          chain_id: { type: 'string' },
          department: { type: 'string' },
          include_deals: { type: 'boolean', default: true },
          include_inference: { type: 'boolean', default: true },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
  }, async (request, reply) => {
    const { store_id, chain_id, department, include_deals, include_inference, limit } = request.body;
    const query = sanitizeQuery(request.body.query);
    if (!query) throw new ValidationError('Query cannot be empty');

    const startTime = Date.now();

    // Check cache first
    const cacheKey = `search:${store_id || 'any'}:${query}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return success(cached, { source: 'cache', latencyMs: Date.now() - startTime });
    }

    const results = [];
    let usedInference = false;
    let deals = [];

    // ── Step 1: Database lookup ──
    if (db.isConnected() && store_id) {
      try {
        const dbResults = await db.productLocations.search(store_id, query, { limit });
        if (dbResults?.length > 0) {
          for (const hit of dbResults) {
            results.push({
              type: 'exact',
              confidence: hit.confidence || 0.92,
              source: 'database',
              productName: query,
              aisle: hit.aisles?.aisle_number || hit.aisle_number,
              department: hit.categories?.name || hit.department,
              locationDetail: hit.location_detail,
              isTemporary: hit.is_temporary || false,
              verifiedCount: hit.verified_count || 0,
              reasoning: null,
              lastUpdated: hit.updated_at,
            });
          }
        }
      } catch (err) {
        request.log.warn({ err }, 'Database search failed, continuing with inference');
      }
    }

    // ── Step 2: AI Inference (if no exact results) ──
    if (results.length === 0 && include_inference) {
      const inferCacheKey = `infer:${store_id || 'any'}:${query}`;
      let inferenceResult = agentCache.get(inferCacheKey);

      if (!inferenceResult) {
        try {
          let storeAisles = [];
          let chainName = 'Unknown';

          if (db.isConnected() && store_id) {
            storeAisles = await db.aisles.listByStore(store_id);
            try {
              const store = await db.stores.getById(store_id);
              chainName = store?.chains?.name || 'Unknown';
            } catch { /* store not found, continue */ }
          }

          inferenceResult = await Agents.categoryInference(query, storeAisles, chainName);
          if (inferenceResult) {
            agentCache.set(inferCacheKey, inferenceResult);
          }
        } catch (err) {
          request.log.warn({ err }, 'AI inference failed');
        }
      }

      if (inferenceResult?.data?.primary_match) {
        usedInference = true;
        const match = inferenceResult.data.primary_match;
        results.push({
          type: 'inferred',
          confidence: match.confidence,
          source: 'ai_inference',
          productName: query,
          aisle: match.aisle,
          department: match.department,
          reasoning: match.reasoning,
          isTemporary: false,
          verifiedCount: 0,
        });

        if (inferenceResult.data.alternate_matches) {
          for (const alt of inferenceResult.data.alternate_matches) {
            results.push({
              type: 'alternate',
              confidence: alt.confidence,
              source: 'ai_inference',
              productName: query,
              aisle: alt.aisle,
              department: alt.department,
              reasoning: alt.reasoning,
              isTemporary: false,
              verifiedCount: 0,
            });
          }
        }
      }
    }

    // ── Step 3: Active deals ──
    if (include_deals) {
      try {
        if (db.isConnected()) {
          deals = await db.deals.search(query, { storeId: store_id, chainId: chain_id, limit: 5 });
        }
      } catch (err) {
        request.log.warn({ err }, 'Deals lookup failed');
      }
    }

    // Sort results by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    const responseData = {
      query,
      store_id,
      results: results.slice(0, limit),
      deals: (deals || []).map(d => ({
        product_name: d.product_name,
        sale_price: d.sale_price,
        regular_price: d.regular_price,
        discount_text: d.discount_text,
        placement_hint: d.placement_hint,
        is_digital_coupon: d.is_digital_coupon,
        ends: d.end_date,
      })),
    };

    // Cache the results
    searchCache.set(cacheKey, responseData);

    return success(responseData, {
      has_exact_match: results.some(r => r.type === 'exact'),
      used_inference: usedInference,
      deals_found: deals?.length || 0,
      result_count: results.length,
      latencyMs: Date.now() - startTime,
    });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/search/categories — Browse categories
  // ══════════════════════════════════════════
  app.get('/categories', async (request) => {
    const { store_id } = request.query;
    if (!db.isConnected()) return success({ categories: [] });
    if (!store_id) return success({ categories: await db.categories.list() });
    const aisles = await db.aisles.listByStore(store_id);
    return success({ aisles });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/search/suggest — Autocomplete suggestions
  // ══════════════════════════════════════════
  app.get('/suggest', async (request) => {
    const q = sanitizeQuery(request.query.q || '');
    if (q.length < 2) return success({ suggestions: [] });

    const suggestions = [];

    // Category name matches
    if (db.isConnected()) {
      try {
        const cats = await db.categories.findByName(q);
        suggestions.push(...(cats || []).map(c => ({
          text: c.name,
          type: 'category',
          id: c.id,
        })));
      } catch {}
    }

    // Popular search terms (from cache stats could be used here)
    const popular = [
      'Milk', 'Bread', 'Eggs', 'Butter', 'Chicken', 'Ground Beef', 'Rice',
      'Pasta', 'Tomato Sauce', 'Cereal', 'Coffee', 'Tea', 'Sugar', 'Flour',
      'Chips', 'Cookies', 'Ice Cream', 'Cheese', 'Yogurt', 'Apples',
      'Bananas', 'Lettuce', 'Tomatoes', 'Potatoes', 'Onions', 'Garlic',
      'Olive Oil', 'Salt', 'Pepper', 'Paper Towels', 'Toilet Paper',
      'Laundry Detergent', 'Dish Soap', 'Shampoo', 'Toothpaste',
      'Dog Food', 'Cat Food', 'Baby Wipes', 'Diapers', 'Ketchup',
      'Mustard', 'BBQ Sauce', 'Soy Sauce', 'Hot Sauce', 'Mayonnaise',
    ].filter(s => s.toLowerCase().includes(q.toLowerCase()))
     .slice(0, 8)
     .map(text => ({ text, type: 'popular' }));

    suggestions.push(...popular);

    return success({ suggestions: suggestions.slice(0, 10) });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/search/feedback — Report result accuracy
  // ══════════════════════════════════════════
  app.post('/feedback', {
    schema: {
      body: {
        type: 'object',
        required: ['query', 'result_aisle', 'is_correct'],
        properties: {
          query: { type: 'string' },
          store_id: { type: 'string' },
          result_aisle: { type: 'string' },
          is_correct: { type: 'boolean' },
          correct_aisle: { type: 'string' },
          notes: { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (request) => {
    const { query, store_id, result_aisle, is_correct, correct_aisle, notes } = request.body;

    // Log feedback for training
    request.log.info({
      type: 'search_feedback',
      query, store_id, result_aisle,
      is_correct, correct_aisle, notes,
    });

    // If connected and we have a location ID, update confidence
    if (db.isConnected() && store_id) {
      try {
        if (is_correct) {
          // Boost confidence of correct results
          const locations = await db.productLocations.search(store_id, query, { limit: 1 });
          if (locations?.[0]?.id) {
            await db.productLocations.incrementVerified(locations[0].id);
          }
        } else if (correct_aisle) {
          // User provided correct aisle — create community contribution
          await db.contributions.create({
            store_id,
            type: 'correction',
            product_name: query,
            aisle_number: correct_aisle,
            notes: notes || `Correction: was ${result_aisle}, actually in ${correct_aisle}`,
            status: 'pending',
          });
        }
      } catch (err) {
        request.log.warn({ err }, 'Failed to process feedback');
      }
    }

    // Invalidate search cache for this query
    searchCache.invalidatePrefix(`search:${store_id || 'any'}:${query}`);

    return success({ recorded: true });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/search/trending — Popular searches
  // ══════════════════════════════════════════
  app.get('/trending', async (request) => {
    const { store_id } = request.query;

    // For now return popular items; later we'd track actual search analytics
    const trending = [
      { query: 'Milk', searches: 1240 },
      { query: 'Bread', searches: 980 },
      { query: 'Eggs', searches: 870 },
      { query: 'Chicken Breast', searches: 650 },
      { query: 'Ground Beef', searches: 540 },
      { query: 'Butter', searches: 480 },
      { query: 'Cheese', searches: 450 },
      { query: 'Coffee', searches: 420 },
      { query: 'Rice', searches: 380 },
      { query: 'Pasta', searches: 350 },
    ];

    return success({ trending, store_id });
  });
}
