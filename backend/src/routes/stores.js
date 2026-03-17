/**
 * WhereIsIt — Store Routes (Production)
 * Full CRUD, nearby search, aisle management,
 * department management, and store analytics.
 */

import * as db from '../services/supabase.js';
import { Agents } from '../agents/pipeline.js';
import { success, paginated, ValidationError, NotFoundError } from '../lib/errors.js';
import {
  parsePagination, parseSort, sanitize,
  validateStoreSubmission, validateCoordinates, isUUID,
} from '../lib/validators.js';

export async function storeRoutes(app) {

  // ══════════════════════════════════════════
  // GET /api/v1/stores — List stores
  // ══════════════════════════════════════════
  app.get('/', async (request) => {
    const { page, perPage, offset } = parsePagination(request.query);
    const { chain_id, state, city, format } = request.query;

    if (!db.isConnected()) return paginated([], { page, perPage, total: 0 });

    const { stores, total } = await db.stores.list({
      page, perPage, chainId: chain_id, state, city, format,
    });
    return paginated(stores, { page, perPage, total });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/stores/nearby — GPS-based nearby stores
  // ══════════════════════════════════════════
  app.get('/nearby', async (request) => {
    const { lat, lng, radius_miles = 25, limit = 20 } = request.query;

    if (!lat || !lng) throw new ValidationError('lat and lng are required');
    const coordErrors = validateCoordinates(lat, lng);
    if (coordErrors) throw new ValidationError('Invalid coordinates', coordErrors);

    if (!db.isConnected()) return success({ stores: [] });

    const stores = await db.stores.nearby(
      parseFloat(lat), parseFloat(lng),
      parseFloat(radius_miles), parseInt(limit)
    );
    return success({ stores, count: stores.length });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/stores/search — Search stores by name/address
  // ══════════════════════════════════════════
  app.get('/search', async (request) => {
    const q = sanitize(request.query.q || '');
    if (!q) throw new ValidationError('Search query (q) is required');
    if (!db.isConnected()) return success({ stores: [] });

    const stores = await db.stores.search(q, {
      chain: request.query.chain,
      limit: parseInt(request.query.limit || '20'),
    });
    return success({ stores, count: stores.length });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/stores/:id — Get store details
  // ══════════════════════════════════════════
  app.get('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) throw new NotFoundError('Store', id);

    const store = await db.stores.getById(id);
    return success({ store });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/stores — Submit new store
  // ══════════════════════════════════════════
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'address'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          address: { type: 'string', minLength: 1, maxLength: 500 },
          city: { type: 'string', maxLength: 100 },
          state: { type: 'string', maxLength: 2 },
          zip: { type: 'string', maxLength: 10 },
          chain_name: { type: 'string', maxLength: 100 },
          chain_id: { type: 'string' },
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
          phone: { type: 'string', maxLength: 20 },
          store_number: { type: 'string', maxLength: 20 },
          store_format: { type: 'string', enum: ['standard', 'express', 'super', 'neighborhood', 'warehouse'] },
          has_pharmacy: { type: 'boolean' },
          has_bakery: { type: 'boolean' },
          has_deli: { type: 'boolean' },
          has_fuel: { type: 'boolean' },
          has_liquor: { type: 'boolean' },
        },
      },
    },
  }, async (request) => {
    const body = request.body;

    // Validate
    const errors = validateStoreSubmission(body);
    if (errors) throw new ValidationError('Store submission invalid', errors);

    // Run Store Onboarding Agent for enrichment
    let agentDecision = null;
    try {
      agentDecision = await Agents.storeOnboarding(body.name, body.address, body.chain_name || '');
    } catch (err) {
      request.log.warn({ err }, 'Store onboarding agent failed, proceeding without enrichment');
    }

    const enriched = agentDecision?.data || {};

    // Resolve chain_id
    let chain_id = body.chain_id || null;
    if (!chain_id && body.chain_name && db.isConnected()) {
      try {
        const chains = await db.chains.list();
        const match = chains.find(c =>
          c.name.toLowerCase() === body.chain_name.toLowerCase() ||
          c.slug === body.chain_name.toLowerCase().replace(/\s+/g, '-')
        );
        if (match) chain_id = match.id;
      } catch {}
    }

    if (!db.isConnected()) {
      return success({ message: 'Store validated but database offline', agent_decision: agentDecision });
    }

    // Create store
    const store = await db.stores.create({
      name: body.name,
      address: body.address,
      city: body.city || enriched.city,
      state: body.state || enriched.state,
      zip: body.zip,
      chain_id,
      lat: body.lat,
      lng: body.lng,
      phone: body.phone,
      store_number: body.store_number,
      store_format: body.store_format || enriched.store_format || 'standard',
      has_pharmacy: body.has_pharmacy ?? enriched.chain_features?.has_pharmacy,
      has_bakery: body.has_bakery ?? enriched.chain_features?.has_bakery,
      has_deli: body.has_deli ?? enriched.chain_features?.has_deli,
      has_fuel: body.has_fuel ?? enriched.chain_features?.has_fuel,
      has_liquor: body.has_liquor ?? enriched.chain_features?.has_liquor,
    });

    // Create predicted departments
    if (enriched.predicted_departments?.length > 0) {
      try {
        await db.departments.bulkCreate(store.id, enriched.predicted_departments);
      } catch (err) {
        request.log.warn({ err }, 'Failed to create departments');
      }
    }

    return success({ store, agent_decision: agentDecision }, { created: true });
  });

  // ══════════════════════════════════════════
  // PATCH /api/v1/stores/:id — Update store
  // ══════════════════════════════════════════
  app.patch('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) throw new NotFoundError('Store', id);

    const updates = {};
    const allowed = [
      'name', 'address', 'city', 'state', 'zip', 'phone',
      'store_number', 'store_format', 'has_pharmacy', 'has_bakery',
      'has_deli', 'has_fuel', 'has_liquor', 'lat', 'lng',
      'hours_json', 'is_active',
    ];
    for (const key of allowed) {
      if (request.body[key] !== undefined) updates[key] = request.body[key];
    }

    if (Object.keys(updates).length === 0) throw new ValidationError('No valid fields to update');

    const store = await db.stores.update(id, updates);
    return success({ store });
  });

  // ══════════════════════════════════════════
  // DELETE /api/v1/stores/:id — Delete store
  // ══════════════════════════════════════════
  app.delete('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) throw new NotFoundError('Store', id);
    await db.stores.delete(id);
    return success({ deleted: true });
  });

  // ══════════════════════════════════════════
  // AISLE SUB-ROUTES
  // ══════════════════════════════════════════

  // GET /api/v1/stores/:id/aisles
  app.get('/:id/aisles', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) return success({ aisles: [] });
    const aisles = await db.aisles.listByStore(id);
    return success({ aisles, count: aisles.length });
  });

  // POST /api/v1/stores/:id/aisles — Add aisle
  app.post('/:id/aisles', {
    schema: {
      body: {
        type: 'object',
        required: ['aisle_number'],
        properties: {
          aisle_number: { type: 'string', minLength: 1, maxLength: 10 },
          aisle_label: { type: 'string', maxLength: 100 },
          department_id: { type: 'string' },
          side_a_categories: { type: 'array', items: { type: 'string' } },
          side_b_categories: { type: 'array', items: { type: 'string' } },
          is_split: { type: 'boolean', default: true },
          notes: { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) throw new NotFoundError('Store', id);

    const aisle = await db.aisles.create({ ...request.body, store_id: id });
    return success({ aisle }, { created: true });
  });

  // PUT /api/v1/stores/:id/aisles/bulk — Bulk upsert aisles
  app.put('/:id/aisles/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['aisles'],
        properties: {
          aisles: {
            type: 'array',
            items: {
              type: 'object',
              required: ['aisle_number'],
              properties: {
                aisle_number: { type: 'string' },
                aisle_label: { type: 'string' },
                side_a_categories: { type: 'array', items: { type: 'string' } },
                side_b_categories: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) throw new NotFoundError('Store', id);

    const aisles = await db.aisles.bulkUpsert(id, request.body.aisles);
    return success({ aisles, count: aisles.length });
  });

  // ══════════════════════════════════════════
  // DEPARTMENT SUB-ROUTES
  // ══════════════════════════════════════════

  // GET /api/v1/stores/:id/departments
  app.get('/:id/departments', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) return success({ departments: [] });
    const departments = await db.departments.listByStore(id);
    return success({ departments, count: departments.length });
  });

  // POST /api/v1/stores/:id/departments — Add department
  app.post('/:id/departments', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          floor_section: { type: 'string', maxLength: 50 },
          display_order: { type: 'integer', minimum: 0 },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    if (!db.isConnected()) throw new NotFoundError('Store', id);

    const dept = await db.departments.create({ ...request.body, store_id: id });
    return success({ department: dept }, { created: true });
  });

  // ══════════════════════════════════════════
  // PRODUCT LOCATIONS SUB-ROUTES
  // ══════════════════════════════════════════

  // GET /api/v1/stores/:id/products
  app.get('/:id/products', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid store ID format');
    const { page, perPage } = parsePagination(request.query);
    if (!db.isConnected()) return paginated([], { page, perPage, total: 0 });

    const { locations, total } = await db.productLocations.getByStore(id, { page, perPage });
    return paginated(locations, { page, perPage, total });
  });
}
