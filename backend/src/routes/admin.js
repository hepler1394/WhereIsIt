/**
 * WhereIsIt — Admin Routes (Production)
 * Dashboard stats, system health, cache management,
 * agent monitoring, and bulk operations.
 */

import * as db from '../services/supabase.js';
import { success, ValidationError } from '../lib/errors.js';
import { chainCache, storeCache, searchCache, categoryCache, dealsCache, agentCache } from '../lib/cache.js';
import { Agents } from '../agents/pipeline.js';

export async function adminRoutes(app) {

  // ══════════════════════════════════════════
  // GET /api/v1/admin/dashboard — System overview
  // ══════════════════════════════════════════
  app.get('/dashboard', async () => {
    const [dbHealth, dbStats] = await Promise.all([
      db.checkHealth(),
      db.isConnected() ? db.stats.getDashboard() : null,
    ]);

    return success({
      database: dbHealth,
      stats: dbStats || { chains: 0, stores: 0, product_locations: 0, deals: 0, users: 0 },
      cache: {
        chains: chainCache.getStats(),
        stores: storeCache.getStats(),
        search: searchCache.getStats(),
        categories: categoryCache.getStats(),
        deals: dealsCache.getStats(),
        agents: agentCache.getStats(),
      },
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/admin/health — Detailed health check
  // ══════════════════════════════════════════
  app.get('/health', async () => {
    const checks = {};

    // Database
    checks.database = await db.checkHealth();

    // Gemini API
    try {
      const { getModel } = await import('../services/gemini.js');
      checks.gemini = { status: getModel() ? 'configured' : 'not_configured' };
    } catch {
      checks.gemini = { status: 'error' };
    }

    // Meilisearch
    try {
      const { isHealthy } = await import('../services/meilisearch.js');
      checks.meilisearch = { status: await isHealthy() ? 'healthy' : 'unhealthy' };
    } catch {
      checks.meilisearch = { status: 'not_configured' };
    }

    const allHealthy = Object.values(checks).every(c => 
      c.status === 'healthy' || c.status === 'configured'
    );

    return success({
      overall: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/admin/cache/clear — Clear caches
  // ══════════════════════════════════════════
  app.post('/cache/clear', async (request) => {
    const { type } = request.body || {};

    const caches = { chains: chainCache, stores: storeCache, search: searchCache, categories: categoryCache, deals: dealsCache, agents: agentCache };

    if (type && caches[type]) {
      caches[type].clear();
      return success({ cleared: type, message: `${type} cache cleared` });
    }

    // Clear all
    for (const cache of Object.values(caches)) cache.clear();
    return success({ cleared: 'all', message: 'All caches cleared' });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/admin/cache/stats — Cache statistics
  // ══════════════════════════════════════════
  app.get('/cache/stats', async () => {
    return success({
      chains: chainCache.getStats(),
      stores: storeCache.getStats(),
      search: searchCache.getStats(),
      categories: categoryCache.getStats(),
      deals: dealsCache.getStats(),
      agents: agentCache.getStats(),
    });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/admin/agents/test — Test agent pipeline
  // ══════════════════════════════════════════
  app.post('/agents/test', {
    schema: {
      body: {
        type: 'object',
        required: ['agent', 'input'],
        properties: {
          agent: { type: 'string', enum: [
            'contentModeration', 'categoryInference', 'layoutPrediction',
            'adsPricing', 'qualityAssurance', 'safetyCompliance',
            'storeOnboarding', 'pricingAgent',
          ]},
          input: { type: 'object' },
        },
      },
    },
  }, async (request) => {
    const { agent, input } = request.body;
    const startTime = Date.now();

    let result;
    try {
      switch (agent) {
        case 'contentModeration':
          result = await Agents.contentModeration(input.text, input.aisle, input.notes);
          break;
        case 'categoryInference':
          result = await Agents.categoryInference(input.query, input.aisles || [], input.chain || 'Unknown');
          break;
        case 'layoutPrediction':
          result = await Agents.layoutPrediction(input.chain, input.format);
          break;
        case 'storeOnboarding':
          result = await Agents.storeOnboarding(input.name, input.address, input.chain);
          break;
        default:
          throw new ValidationError(`Agent '${agent}' test not implemented`);
      }
    } catch (err) {
      result = { error: err.message };
    }

    return success({
      agent,
      result,
      latencyMs: Date.now() - startTime,
    });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/admin/deals/cleanup — Remove expired deals
  // ══════════════════════════════════════════
  app.post('/deals/cleanup', async () => {
    if (!db.isConnected()) return success({ deleted: 0 });
    const count = await db.deals.deleteExpired();
    return success({ deleted: count });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/admin/contributions/review — Pending contributions
  // ══════════════════════════════════════════
  app.get('/contributions/review', async (request) => {
    if (!db.isConnected()) return success({ items: [] });
    const limit = parseInt(request.query.limit || '50');
    const { contributions, total } = await db.contributions.list({
      status: 'pending', perPage: limit,
    });
    return success({ items: contributions, total });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/admin/bulk-approve — Approve multiple contributions
  // ══════════════════════════════════════════
  app.post('/bulk-approve', {
    schema: {
      body: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: 'array', items: { type: 'string' }, maxItems: 100 },
        },
      },
    },
  }, async (request) => {
    if (!db.isConnected()) return success({ approved: 0 });
    const results = [];
    for (const id of request.body.ids) {
      try {
        await db.contributions.updateStatus(id, 'approved');
        results.push({ id, status: 'approved' });
      } catch (err) {
        results.push({ id, status: 'error', message: err.message });
      }
    }
    return success({
      approved: results.filter(r => r.status === 'approved').length,
      failed: results.filter(r => r.status === 'error').length,
      details: results,
    });
  });
}
