/**
 * WhereIsIt — Chain Routes (Production)
 * Chain management, theming, and chain-specific data.
 */

import * as db from '../services/supabase.js';
import { success, paginated, ValidationError, NotFoundError } from '../lib/errors.js';
import { validateChainSubmission, isUUID, isSlug, sanitize } from '../lib/validators.js';

export async function chainRoutes(app) {

  // ══════════════════════════════════════════
  // GET /api/v1/chains — List all chains
  // ══════════════════════════════════════════
  app.get('/', async () => {
    if (!db.isConnected()) return success({ chains: [] });
    const chains = await db.chains.list();
    return success({ chains, count: chains.length });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/chains/:idOrSlug — Get chain by ID or slug
  // ══════════════════════════════════════════
  app.get('/:idOrSlug', async (request) => {
    const { idOrSlug } = request.params;
    if (!db.isConnected()) throw new NotFoundError('Chain', idOrSlug);

    let chain;
    if (isUUID(idOrSlug)) {
      chain = await db.chains.getById(idOrSlug);
    } else {
      chain = await db.chains.getBySlug(idOrSlug);
    }
    return success({ chain });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/chains — Create chain
  // ══════════════════════════════════════════
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          slug: { type: 'string', maxLength: 64 },
          logo_url: { type: 'string', maxLength: 1000 },
          website_url: { type: 'string', maxLength: 500 },
          primary_color: { type: 'string', maxLength: 7 },
          secondary_color: { type: 'string', maxLength: 7 },
          accent_color: { type: 'string', maxLength: 7 },
          headquarters: { type: 'string', maxLength: 200 },
          founded_year: { type: 'integer', minimum: 1800, maximum: 2100 },
          store_count_approx: { type: 'integer', minimum: 0 },
          regions: { type: 'array', items: { type: 'string' } },
          loyalty_program_name: { type: 'string', maxLength: 100 },
          loyalty_program_details: { type: 'string', maxLength: 500 },
          has_app: { type: 'boolean' },
          app_url: { type: 'string', maxLength: 1000 },
          typical_format: { type: 'string', enum: ['standard', 'express', 'super', 'neighborhood', 'warehouse', 'club'] },
          typical_departments: { type: 'array', items: { type: 'string' } },
          digital_coupons_available: { type: 'boolean' },
          weekly_ad_url: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (request) => {
    const body = request.body;
    const errors = validateChainSubmission(body);
    if (errors) throw new ValidationError('Chain data invalid', errors);

    // Auto-generate slug if not provided
    if (!body.slug) {
      body.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    if (!db.isConnected()) return success({ message: 'Database offline' });

    const chain = await db.chains.create(body);
    return success({ chain }, { created: true });
  });

  // ══════════════════════════════════════════
  // PATCH /api/v1/chains/:id — Update chain
  // ══════════════════════════════════════════
  app.patch('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid chain ID');
    if (!db.isConnected()) throw new NotFoundError('Chain', id);

    const allowed = [
      'name', 'slug', 'logo_url', 'website_url',
      'primary_color', 'secondary_color', 'accent_color',
      'headquarters', 'founded_year', 'store_count_approx',
      'regions', 'loyalty_program_name', 'loyalty_program_details',
      'has_app', 'app_url', 'typical_format', 'typical_departments',
      'digital_coupons_available', 'weekly_ad_url',
    ];
    const updates = {};
    for (const key of allowed) {
      if (request.body[key] !== undefined) updates[key] = request.body[key];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('No fields to update');

    const chain = await db.chains.update(id, updates);
    return success({ chain });
  });

  // ══════════════════════════════════════════
  // DELETE /api/v1/chains/:id — Delete chain
  // ══════════════════════════════════════════
  app.delete('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid chain ID');
    if (!db.isConnected()) throw new NotFoundError('Chain', id);
    await db.chains.delete(id);
    return success({ deleted: true });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/chains/:id/stores — Stores for a chain
  // ══════════════════════════════════════════
  app.get('/:id/stores', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid chain ID');
    if (!db.isConnected()) return success({ stores: [] });

    const { stores, total } = await db.stores.list({ chainId: id, perPage: 100 });
    return success({ stores, count: stores?.length || 0, total });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/chains/:id/deals — Active deals for chain
  // ══════════════════════════════════════════
  app.get('/:id/deals', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid chain ID');
    if (!db.isConnected()) return success({ deals: [] });

    const deals = await db.deals.getActive(null, { chainId: id });
    return success({ deals, count: deals?.length || 0 });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/chains/:id/theme — Get chain theme
  // ══════════════════════════════════════════
  app.get('/:id/theme', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid chain ID');
    if (!db.isConnected()) throw new NotFoundError('Chain', id);

    const chain = await db.chains.getById(id);
    return success({
      theme: {
        primary: chain.primary_color || '#E31837',
        secondary: chain.secondary_color || '#FFFFFF',
        accent: chain.accent_color || chain.primary_color || '#E31837',
        name: chain.name,
        slug: chain.slug,
        logoUrl: chain.logo_url,
      },
    });
  });
}
