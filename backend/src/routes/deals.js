/**
 * WhereIsIt — Deals Routes (Production)
 * Browse, search, and manage promotional deals.
 * Supports chain-wide and store-specific deals.
 */

import * as db from '../services/supabase.js';
import { success, paginated, ValidationError, NotFoundError } from '../lib/errors.js';
import { parsePagination, sanitize, validateDealSubmission, isUUID, today } from '../lib/validators.js';

export async function dealsRoutes(app) {

  // ══════════════════════════════════════════
  // GET /api/v1/deals — List active deals
  // ══════════════════════════════════════════
  app.get('/', async (request) => {
    const { store_id, chain_id, limit = 50 } = request.query;
    if (!db.isConnected()) return success({ deals: [] });

    const deals = await db.deals.getActive(store_id, {
      chainId: chain_id,
      limit: parseInt(limit),
    });

    return success({ deals, count: deals.length, as_of: today() });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/deals/search — Search deals
  // ══════════════════════════════════════════
  app.get('/search', async (request) => {
    const q = sanitize(request.query.q || '');
    if (!q) throw new ValidationError('Search query (q) is required');
    if (!db.isConnected()) return success({ deals: [] });

    const { store_id, chain_id, limit = 20 } = request.query;
    const deals = await db.deals.search(q, {
      storeId: store_id,
      chainId: chain_id,
      limit: parseInt(limit),
    });

    return success({ deals, count: deals.length, query: q });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/deals — Create deal (admin/crawler)
  // ══════════════════════════════════════════
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['product_name'],
        properties: {
          product_name: { type: 'string', minLength: 1, maxLength: 200 },
          store_id: { type: 'string' },
          chain_id: { type: 'string' },
          sale_price: { type: 'number', minimum: 0 },
          regular_price: { type: 'number', minimum: 0 },
          discount_text: { type: 'string', maxLength: 200 },
          buy_quantity: { type: 'integer', minimum: 1 },
          get_quantity: { type: 'integer', minimum: 1 },
          deal_type: { type: 'string', enum: ['sale', 'bogo', 'coupon', 'clearance', 'digital_coupon'] },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          placement_hint: { type: 'string', maxLength: 200 },
          source_url: { type: 'string', maxLength: 1000 },
          is_digital_coupon: { type: 'boolean', default: false },
          upc: { type: 'string', maxLength: 20 },
          image_url: { type: 'string', maxLength: 1000 },
          category: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request) => {
    const body = request.body;
    const errors = validateDealSubmission(body);
    if (errors) throw new ValidationError('Deal data invalid', errors);

    if (!db.isConnected()) return success({ message: 'Database offline' });

    // Default dates
    if (!body.start_date) body.start_date = today();
    if (!body.end_date) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      body.end_date = d.toISOString().split('T')[0];
    }

    const deal = await db.deals.create(body);
    return success({ deal }, { created: true });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/deals/bulk — Bulk create deals (crawler)
  // ══════════════════════════════════════════
  app.post('/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['deals'],
        properties: {
          deals: {
            type: 'array',
            minItems: 1,
            maxItems: 500,
            items: {
              type: 'object',
              required: ['product_name'],
              properties: {
                product_name: { type: 'string' },
                store_id: { type: 'string' },
                chain_id: { type: 'string' },
                sale_price: { type: 'number' },
                regular_price: { type: 'number' },
                discount_text: { type: 'string' },
                deal_type: { type: 'string' },
                start_date: { type: 'string' },
                end_date: { type: 'string' },
                is_digital_coupon: { type: 'boolean' },
                upc: { type: 'string' },
                category: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request) => {
    if (!db.isConnected()) return success({ message: 'Database offline' });

    const count = request.body.deals.length;
    const results = await db.deals.bulkCreate(request.body.deals);

    return success({
      imported: results.length,
      total_submitted: count,
      failed: count - results.length,
    });
  });

  // ══════════════════════════════════════════
  // DELETE /api/v1/deals/expired — Cleanup expired deals
  // ══════════════════════════════════════════
  app.delete('/expired', async () => {
    if (!db.isConnected()) return success({ deleted: 0 });
    const count = await db.deals.deleteExpired();
    return success({ deleted: count });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/deals/summary — Deal statistics
  // ══════════════════════════════════════════
  app.get('/summary', async (request) => {
    const { store_id, chain_id } = request.query;
    if (!db.isConnected()) return success({ summary: {} });

    const deals = await db.deals.getActive(store_id, { chainId: chain_id });

    const byType = {};
    let avgDiscount = 0;
    let totalSavings = 0;

    for (const deal of deals) {
      byType[deal.deal_type || 'sale'] = (byType[deal.deal_type || 'sale'] || 0) + 1;
      if (deal.regular_price && deal.sale_price) {
        totalSavings += deal.regular_price - deal.sale_price;
        avgDiscount += ((deal.regular_price - deal.sale_price) / deal.regular_price) * 100;
      }
    }

    if (deals.length > 0) avgDiscount /= deals.length;

    return success({
      summary: {
        total_deals: deals.length,
        by_type: byType,
        average_discount_pct: Math.round(avgDiscount * 10) / 10,
        total_potential_savings: Math.round(totalSavings * 100) / 100,
        digital_coupons: deals.filter(d => d.is_digital_coupon).length,
      },
    });
  });
}
