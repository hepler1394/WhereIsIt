/**
 * WhereIsIt — Expanded Supabase Database Service
 * Full-featured database layer with query builders, transactions,
 * caching integration, error handling, and health checks.
 */

import { createClient } from '@supabase/supabase-js';
import { ServiceUnavailableError, ExternalServiceError, NotFoundError, ConflictError } from '../lib/errors.js';
import { chainCache, storeCache, categoryCache, dealsCache } from '../lib/cache.js';

// ══════════════════════════════════════════
// Client Setup
// ══════════════════════════════════════════

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let _client = null;
let _anonClient = null;

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[DB] Supabase credentials not set — database features disabled');
    return null;
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
      global: {
        headers: { 'x-client': 'whereisit-backend' },
      },
    });
  }
  return _client;
}

function getAnonClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_anonClient) {
    _anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _anonClient;
}

export const supabase = getClient();
export const supabaseAnon = getAnonClient();
export const isConnected = () => !!getClient();

// ══════════════════════════════════════════
// Health Check
// ══════════════════════════════════════════

export async function checkHealth() {
  const client = getClient();
  if (!client) return { status: 'disconnected', message: 'No credentials configured' };
  try {
    const start = Date.now();
    const { error } = await client.from('chains').select('id').limit(1);
    const latencyMs = Date.now() - start;
    if (error) return { status: 'error', message: error.message, latencyMs };
    return { status: 'healthy', latencyMs };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// ══════════════════════════════════════════
// Query Helpers
// ══════════════════════════════════════════

/**
 * Run a Supabase query with error handling.
 * Throws ServiceUnavailableError if client is null.
 * Throws ExternalServiceError if query fails.
 */
async function runQuery(fn) {
  const client = getClient();
  if (!client) throw new ServiceUnavailableError('Database');
  const { data, error, count } = await fn(client);
  if (error) {
    if (error.code === '23505') throw new ConflictError(error.message);
    throw new ExternalServiceError('Supabase', error);
  }
  return { data, count };
}

/**
 * Find one record or throw NotFoundError.
 */
async function findOneOrThrow(table, id, select = '*', resourceName = 'Record') {
  const { data } = await runQuery(client =>
    client.from(table).select(select).eq('id', id).single()
  );
  if (!data) throw new NotFoundError(resourceName, id);
  return data;
}

// ══════════════════════════════════════════
// CHAINS
// ══════════════════════════════════════════

export const chains = {
  async list() {
    return chainCache.getOrSet('chains:all', async () => {
      const { data } = await runQuery(c => c.from('chains').select('*').order('name'));
      return data;
    });
  },

  async getById(id) {
    return chainCache.getOrSet(`chain:${id}`, async () => {
      return findOneOrThrow('chains', id, '*', 'Chain');
    });
  },

  async getBySlug(slug) {
    return chainCache.getOrSet(`chain:slug:${slug}`, async () => {
      const { data } = await runQuery(c =>
        c.from('chains').select('*').eq('slug', slug).single()
      );
      if (!data) throw new NotFoundError('Chain', slug);
      return data;
    });
  },

  async create(chainData) {
    const { data } = await runQuery(c =>
      c.from('chains').insert(chainData).select().single()
    );
    chainCache.invalidatePrefix('chains:');
    return data;
  },

  async update(id, updates) {
    const { data } = await runQuery(c =>
      c.from('chains').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    );
    chainCache.invalidatePrefix('chain');
    return data;
  },

  async delete(id) {
    await runQuery(c => c.from('chains').delete().eq('id', id));
    chainCache.invalidatePrefix('chain');
    return true;
  },
};

// ══════════════════════════════════════════
// STORES
// ══════════════════════════════════════════

export const stores = {
  async list({ page = 1, perPage = 20, chainId, state, city, format } = {}) {
    const offset = (page - 1) * perPage;
    const { data, count } = await runQuery(c => {
      let q = c.from('stores')
        .select('*, chains(name, slug, logo_url, primary_color)', { count: 'exact' });
      if (chainId) q = q.eq('chain_id', chainId);
      if (state) q = q.eq('state', state);
      if (city) q = q.ilike('city', `%${city}%`);
      if (format) q = q.eq('store_format', format);
      return q.range(offset, offset + perPage - 1).order('created_at', { ascending: false });
    });
    return { stores: data, total: count };
  },

  async getById(id) {
    return storeCache.getOrSet(`store:${id}`, async () => {
      return findOneOrThrow('stores', id, `
        *,
        chains(name, slug, logo_url, primary_color, secondary_color, accent_color, loyalty_program_name, loyalty_program_details),
        departments(id, name, description, floor_section, display_order),
        aisles(id, aisle_number, aisle_label, side_a_categories, side_b_categories, is_split, notes)
      `, 'Store');
    });
  },

  async nearby(lat, lng, radiusMiles = 25, limit = 20) {
    const cacheKey = `stores:nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusMiles}`;
    return storeCache.getOrSet(cacheKey, async () => {
      const radiusDeg = radiusMiles / 69;
      const { data } = await runQuery(c =>
        c.from('stores')
          .select('*, chains(name, slug, logo_url, primary_color, secondary_color)')
          .gte('lat', lat - radiusDeg).lte('lat', lat + radiusDeg)
          .gte('lng', lng - radiusDeg).lte('lng', lng + radiusDeg)
          .limit(limit)
      );
      return (data || []).map(store => ({
        ...store,
        distance_miles: Math.round(
          Math.sqrt(Math.pow((store.lat - lat) * 69, 2) + Math.pow((store.lng - lng) * 54.6, 2)) * 10
        ) / 10,
      })).sort((a, b) => a.distance_miles - b.distance_miles);
    }, 2 * 60 * 1000);
  },

  async search(q, { chain, limit = 20 } = {}) {
    const { data } = await runQuery(c => {
      let query = c.from('stores')
        .select('*, chains(name, slug, logo_url, primary_color)')
        .or(`name.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(limit);
      if (chain) query = query.eq('chains.slug', chain);
      return query;
    });
    return data;
  },

  async create(storeData) {
    const { data } = await runQuery(c =>
      c.from('stores').insert(storeData).select().single()
    );
    storeCache.invalidatePrefix('store');
    return data;
  },

  async update(id, updates) {
    const { data } = await runQuery(c =>
      c.from('stores').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    );
    storeCache.invalidatePrefix('store');
    return data;
  },

  async delete(id) {
    await runQuery(c => c.from('stores').delete().eq('id', id));
    storeCache.invalidatePrefix('store');
    return true;
  },
};

// ══════════════════════════════════════════
// AISLES
// ══════════════════════════════════════════

export const aisles = {
  async listByStore(storeId) {
    return storeCache.getOrSet(`aisles:store:${storeId}`, async () => {
      const { data } = await runQuery(c =>
        c.from('aisles')
          .select('*, departments(name)')
          .eq('store_id', storeId)
          .order('aisle_number')
      );
      return data;
    });
  },

  async getById(id) {
    return findOneOrThrow('aisles', id, '*, departments(name)', 'Aisle');
  },

  async create(aisleData) {
    const { data } = await runQuery(c =>
      c.from('aisles').insert(aisleData).select().single()
    );
    storeCache.invalidatePrefix(`aisles:store:${aisleData.store_id}`);
    return data;
  },

  async update(id, updates) {
    const { data } = await runQuery(c =>
      c.from('aisles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    );
    storeCache.invalidatePrefix('aisles:');
    return data;
  },

  async bulkUpsert(storeId, aislesData) {
    const items = aislesData.map(a => ({ ...a, store_id: storeId }));
    const { data } = await runQuery(c =>
      c.from('aisles').upsert(items, { onConflict: 'store_id,aisle_number' }).select()
    );
    storeCache.invalidatePrefix(`aisles:store:${storeId}`);
    return data;
  },
};

// ══════════════════════════════════════════
// DEPARTMENTS
// ══════════════════════════════════════════

export const departments = {
  async listByStore(storeId) {
    const { data } = await runQuery(c =>
      c.from('departments').select('*').eq('store_id', storeId).order('display_order')
    );
    return data;
  },

  async create(deptData) {
    const { data } = await runQuery(c =>
      c.from('departments').insert(deptData).select().single()
    );
    return data;
  },

  async bulkCreate(storeId, deptNames) {
    const items = deptNames.map((name, i) => ({ store_id: storeId, name, display_order: i }));
    const { data } = await runQuery(c =>
      c.from('departments').insert(items).select()
    );
    return data;
  },
};

// ══════════════════════════════════════════
// PRODUCT LOCATIONS
// ══════════════════════════════════════════

export const productLocations = {
  async search(storeId, query, { limit = 10 } = {}) {
    const { data } = await runQuery(c =>
      c.from('product_locations')
        .select('*, aisles(aisle_number, aisle_label), categories(name)')
        .eq('store_id', storeId)
        .ilike('product_name', `%${query}%`)
        .order('confidence', { ascending: false })
        .limit(limit)
    );
    return data;
  },

  async getByStore(storeId, { page = 1, perPage = 50, aisle, department } = {}) {
    const offset = (page - 1) * perPage;

    // Find aisle ID if aisle filter is provided
    let aisleId = null;
    if (aisle) {
      try {
        const { data: aisleRow } = await runQuery(c =>
          c.from('aisles').select('id').eq('store_id', storeId).eq('aisle_number', aisle).limit(1)
        );
        if (aisleRow?.[0]) aisleId = aisleRow[0].id;
        else return { locations: [], total: 0 }; // No matching aisle, return empty
      } catch { return { locations: [], total: 0 }; }
    }

    const { data, count } = await runQuery(c => {
      let q = c.from('product_locations')
        .select('*, aisles(aisle_number, aisle_label), categories(name)', { count: 'exact' })
        .eq('store_id', storeId);

      if (aisleId) q = q.eq('aisle_id', aisleId);

      if (department) {
        q = q.or(`product_name.ilike.%${department}%,location_detail.ilike.%${department}%`);
      }

      return q.order('product_name').range(offset, offset + perPage - 1);
    });
    return { locations: data, total: count };
  },

  async create(locationData) {
    const { data } = await runQuery(c =>
      c.from('product_locations').insert(locationData).select().single()
    );
    return data;
  },

  async update(id, updates) {
    const { data } = await runQuery(c =>
      c.from('product_locations').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    );
    return data;
  },

  async incrementVerified(id) {
    await runQuery(c => c.rpc('increment_verified', { location_id: id }));
  },

  async decreaseConfidence(id, amount = 0.05) {
    await runQuery(c => c.rpc('decrease_confidence', { location_id: id, amount }));
  },

  async getNeedsReview({ limit = 20 } = {}) {
    const { data } = await runQuery(c =>
      c.from('product_locations')
        .select('*, stores(name, address), aisles(aisle_number)')
        .eq('needs_review', true)
        .order('updated_at', { ascending: false })
        .limit(limit)
    );
    return data;
  },
};

// ══════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════

export const categories = {
  async list() {
    return categoryCache.getOrSet('categories:all', async () => {
      const { data } = await runQuery(c =>
        c.from('categories').select('*').order('name')
      );
      return data;
    });
  },

  async getById(id) {
    return findOneOrThrow('categories', id, '*', 'Category');
  },

  async create(catData) {
    const { data } = await runQuery(c =>
      c.from('categories').insert(catData).select().single()
    );
    categoryCache.invalidatePrefix('categories');
    return data;
  },

  async findByName(name) {
    const { data } = await runQuery(c =>
      c.from('categories').select('*').ilike('name', `%${name}%`).limit(10)
    );
    return data;
  },
};

// ══════════════════════════════════════════
// DEALS
// ══════════════════════════════════════════

export const deals = {
  async getActive(storeId, { chainId, limit = 50 } = {}) {
    const cacheKey = `deals:active:${storeId || chainId || 'all'}`;
    return dealsCache.getOrSet(cacheKey, async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await runQuery(c => {
        let q = c.from('deals').select('*, chains(name, slug)')
          .lte('start_date', today).gte('end_date', today)
          .order('sale_price');
        if (storeId) q = q.eq('store_id', storeId);
        if (chainId) q = q.eq('chain_id', chainId);
        return q.limit(limit);
      });
      return data;
    });
  },

  async search(query, { storeId, chainId, limit = 20 } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await runQuery(c => {
      let q = c.from('deals').select('*')
        .ilike('product_name', `%${query}%`)
        .lte('start_date', today).gte('end_date', today)
        .limit(limit);
      if (storeId) q = q.eq('store_id', storeId);
      if (chainId) q = q.eq('chain_id', chainId);
      return q;
    });
    return data;
  },

  async create(dealData) {
    const { data } = await runQuery(c =>
      c.from('deals').insert(dealData).select().single()
    );
    dealsCache.invalidatePrefix('deals:');
    return data;
  },

  async bulkCreate(dealsArray) {
    const { data } = await runQuery(c =>
      c.from('deals').insert(dealsArray).select()
    );
    dealsCache.invalidatePrefix('deals:');
    return data;
  },

  async deleteExpired() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await runQuery(c =>
      c.from('deals').delete().lt('end_date', today).select('id')
    );
    dealsCache.invalidatePrefix('deals:');
    return data?.length || 0;
  },
};

// ══════════════════════════════════════════
// CONTRIBUTIONS
// ══════════════════════════════════════════

export const contributions = {
  async list({ page = 1, perPage = 20, status, storeId, userId, type } = {}) {
    const offset = (page - 1) * perPage;
    const { data, count } = await runQuery(c => {
      let q = c.from('contributions')
        .select('*, stores(name, address)', { count: 'exact' });
      if (status) q = q.eq('status', status);
      if (storeId) q = q.eq('store_id', storeId);
      if (userId) q = q.eq('user_id', userId);
      if (type) q = q.eq('type', type);
      return q.range(offset, offset + perPage - 1).order('created_at', { ascending: false });
    });
    return { contributions: data, total: count };
  },

  async create(contribData) {
    const { data } = await runQuery(c =>
      c.from('contributions').insert(contribData).select().single()
    );
    return data;
  },

  async updateStatus(id, status, reviewerId = null) {
    const updates = {
      status,
      reviewed_at: new Date().toISOString(),
    };
    if (reviewerId) updates.reviewer_id = reviewerId;
    const { data } = await runQuery(c =>
      c.from('contributions').update(updates).eq('id', id).select().single()
    );
    return data;
  },

  async getStats(storeId = null) {
    const { data: pending } = await runQuery(c => {
      let q = c.from('contributions').select('id', { count: 'exact' }).eq('status', 'pending');
      if (storeId) q = q.eq('store_id', storeId);
      return q;
    });
    const { data: approved } = await runQuery(c => {
      let q = c.from('contributions').select('id', { count: 'exact' }).eq('status', 'approved');
      if (storeId) q = q.eq('store_id', storeId);
      return q;
    });
    return {
      pending: pending?.length || 0,
      approved: approved?.length || 0,
    };
  },
};

// ══════════════════════════════════════════
// USERS
// ══════════════════════════════════════════

export const users = {
  async getById(id) {
    return findOneOrThrow('users', id, '*', 'User');
  },

  async getByAuthId(authId) {
    const { data } = await runQuery(c =>
      c.from('users').select('*').eq('auth_id', authId).single()
    );
    return data;
  },

  async create(userData) {
    const { data } = await runQuery(c =>
      c.from('users').insert(userData).select().single()
    );
    return data;
  },

  async update(id, updates) {
    const { data } = await runQuery(c =>
      c.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    );
    return data;
  },

  async incrementReputation(userId, amount = 1) {
    await runQuery(c =>
      c.rpc('increment_reputation', { user_id_param: userId, amount })
    );
  },

  async getLeaderboard({ limit = 25 } = {}) {
    const { data } = await runQuery(c =>
      c.from('users')
        .select('id, display_name, avatar_url, reputation_score, trust_level, contributions_count')
        .order('reputation_score', { ascending: false })
        .limit(limit)
    );
    return data;
  },
};

// ══════════════════════════════════════════
// CHAIN THEMES
// ══════════════════════════════════════════

export const chainThemes = {
  async getByChainId(chainId) {
    return chainCache.getOrSet(`theme:${chainId}`, async () => {
      const { data } = await runQuery(c =>
        c.from('chain_themes').select('*').eq('chain_id', chainId).single()
      );
      return data;
    });
  },

  async upsert(themeData) {
    const { data } = await runQuery(c =>
      c.from('chain_themes').upsert(themeData, { onConflict: 'chain_id' }).select().single()
    );
    chainCache.invalidatePrefix('theme:');
    return data;
  },
};

// ══════════════════════════════════════════
// AGGREGATE STATS
// ══════════════════════════════════════════

export const stats = {
  async getDashboard() {
    const [chainsCount, storesCount, locationsCount, dealsCount, usersCount] = await Promise.all([
      runQuery(c => c.from('chains').select('id', { count: 'exact', head: true })),
      runQuery(c => c.from('stores').select('id', { count: 'exact', head: true })),
      runQuery(c => c.from('product_locations').select('id', { count: 'exact', head: true })),
      runQuery(c => c.from('deals').select('id', { count: 'exact', head: true })),
      runQuery(c => c.from('users').select('id', { count: 'exact', head: true })),
    ]);
    return {
      chains: chainsCount.count || 0,
      stores: storesCount.count || 0,
      product_locations: locationsCount.count || 0,
      deals: dealsCount.count || 0,
      users: usersCount.count || 0,
    };
  },
};
