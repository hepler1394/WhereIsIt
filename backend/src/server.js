/**
 * WhereIsIt — Production Server
 * Fastify application with full middleware stack,
 * health checks, graceful shutdown, and all route registrations.
 */

// MUST load env vars before any other imports
import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';

// Middleware & utilities
import { errorHandlerPlugin, success } from './lib/errors.js';
import { chainCache, storeCache, searchCache, categoryCache, dealsCache, agentCache } from './lib/cache.js';
import { checkHealth, isConnected } from './services/supabase.js';

// Routes
import { searchRoutes } from './routes/search.js';
import { storeRoutes } from './routes/stores.js';
import { communityRoutes } from './routes/community.js';
import { dealsRoutes } from './routes/deals.js';
import { chainRoutes } from './routes/chains.js';
import { userRoutes } from './routes/users.js';
import { adminRoutes } from './routes/admin.js';
import { agentRoutes } from './routes/agents.js';

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ══════════════════════════════════════════
// Create App
// ══════════════════════════════════════════

const app = Fastify({
  logger: {
    level: IS_PROD ? 'info' : 'debug',
    transport: IS_PROD ? undefined : {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  },
  trustProxy: IS_PROD,
  requestTimeout: 30000,
  bodyLimit: 5 * 1024 * 1024, // 5MB max body
  disableRequestLogging: IS_PROD,
});

// ══════════════════════════════════════════
// Request Lifecycle Hooks
// ══════════════════════════════════════════

// Add request timing header
app.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  const latency = Date.now() - (request.startTime || Date.now());
  if (!IS_PROD) {
    app.log.debug({ url: request.url, method: request.method, statusCode: reply.statusCode, latencyMs: latency });
  }
  done();
});

// ══════════════════════════════════════════
// Plugins
// ══════════════════════════════════════════

// CORS
await app.register(cors, {
  origin: IS_PROD
    ? [/whereisit\.app$/, /whereisit\.vercel\.app$/, /localhost/]
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400,
});

// Rate limiting
await app.register(rateLimit, {
  max: IS_PROD ? 100 : 500,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  errorResponseBuilder: () => ({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  }),
});

// Security headers (production only)
if (IS_PROD) {
  await app.register(helmet, {
    contentSecurityPolicy: false, // Handled by frontend
    crossOriginEmbedderPolicy: false,
  });
}

// Error handler
await app.register(errorHandlerPlugin);

// ══════════════════════════════════════════
// System Routes
// ══════════════════════════════════════════

// Root
app.get('/', async () => success({
  name: 'WhereIsIt API',
  version: '2.0.0',
  documentation: '/api/v1/docs',
}));

// Health check (for load balancers)
app.get('/health', async () => {
  const dbHealth = await checkHealth();
  const isHealthy = dbHealth.status === 'healthy' || dbHealth.status === 'disconnected';
  return {
    status: isHealthy ? 'ok' : 'degraded',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: dbHealth.status,
    database_latency_ms: dbHealth.latencyMs,
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
});

// Readiness probe (for Kubernetes/Railway)
app.get('/ready', async () => {
  const dbHealth = await checkHealth();
  if (dbHealth.status === 'error') {
    return { status: 'not_ready', database: dbHealth };
  }
  return { status: 'ready' };
});

// API documentation
app.get('/api/v1/docs', async () => success({
  endpoints: {
    search: {
      'POST /api/v1/search': 'Search for product locations',
      'GET /api/v1/search/categories': 'Browse categories',
      'GET /api/v1/search/suggest': 'Search autocomplete',
      'POST /api/v1/search/feedback': 'Report result accuracy',
      'GET /api/v1/search/trending': 'Popular searches',
    },
    stores: {
      'GET /api/v1/stores': 'List stores (paginated)',
      'GET /api/v1/stores/nearby': 'Find nearby stores by GPS',
      'GET /api/v1/stores/search': 'Search stores by name/address',
      'GET /api/v1/stores/:id': 'Get store details',
      'POST /api/v1/stores': 'Submit new store',
      'PATCH /api/v1/stores/:id': 'Update store',
      'DELETE /api/v1/stores/:id': 'Delete store',
      'GET /api/v1/stores/:id/aisles': 'List store aisles',
      'POST /api/v1/stores/:id/aisles': 'Add aisle',
      'PUT /api/v1/stores/:id/aisles/bulk': 'Bulk upsert aisles',
      'GET /api/v1/stores/:id/departments': 'List departments',
      'POST /api/v1/stores/:id/departments': 'Add department',
      'GET /api/v1/stores/:id/products': 'List product locations',
    },
    chains: {
      'GET /api/v1/chains': 'List all chains',
      'GET /api/v1/chains/:idOrSlug': 'Get chain by ID or slug',
      'POST /api/v1/chains': 'Create chain',
      'PATCH /api/v1/chains/:id': 'Update chain',
      'DELETE /api/v1/chains/:id': 'Delete chain',
      'GET /api/v1/chains/:id/stores': 'Chain stores',
      'GET /api/v1/chains/:id/deals': 'Chain deals',
      'GET /api/v1/chains/:id/theme': 'Chain theme colors',
    },
    deals: {
      'GET /api/v1/deals': 'List active deals',
      'GET /api/v1/deals/search': 'Search deals',
      'POST /api/v1/deals': 'Create deal',
      'POST /api/v1/deals/bulk': 'Bulk create deals (crawler)',
      'DELETE /api/v1/deals/expired': 'Cleanup expired',
      'GET /api/v1/deals/summary': 'Deal statistics',
    },
    community: {
      'POST /api/v1/community/submit': 'Submit product location',
      'GET /api/v1/community/contributions': 'List contributions',
      'PATCH /api/v1/community/contributions/:id': 'Moderate contribution',
      'GET /api/v1/community/stats': 'Community statistics',
      'POST /api/v1/community/vote': 'Vote on location',
      'GET /api/v1/community/leaderboard': 'Top contributors',
      'GET /api/v1/community/review-queue': 'Pending review items',
    },
    users: {
      'GET /api/v1/users/:id': 'Get user profile',
      'POST /api/v1/users': 'Register user',
      'PATCH /api/v1/users/:id': 'Update profile',
      'GET /api/v1/users/:id/contributions': 'User contributions',
      'GET /api/v1/users/:id/stats': 'User statistics',
    },
    admin: {
      'GET /api/v1/admin/dashboard': 'System overview',
      'GET /api/v1/admin/health': 'Detailed health checks',
      'POST /api/v1/admin/cache/clear': 'Clear caches',
      'GET /api/v1/admin/cache/stats': 'Cache statistics',
      'POST /api/v1/admin/agents/test': 'Test agent pipeline',
      'POST /api/v1/admin/deals/cleanup': 'Remove expired deals',
      'GET /api/v1/admin/contributions/review': 'Pending review items',
      'POST /api/v1/admin/bulk-approve': 'Bulk approve contributions',
    },
    agents: {
      'POST /api/v1/agents/infer': 'Run AI inference',
      'POST /api/v1/agents/moderate': 'Content moderation',
    },
  },
  total_endpoints: 45,
}));

// ══════════════════════════════════════════
// API Route Registration
// ══════════════════════════════════════════

app.register(searchRoutes, { prefix: '/api/v1/search' });
app.register(storeRoutes, { prefix: '/api/v1/stores' });
app.register(communityRoutes, { prefix: '/api/v1/community' });
app.register(dealsRoutes, { prefix: '/api/v1/deals' });
app.register(chainRoutes, { prefix: '/api/v1/chains' });
app.register(userRoutes, { prefix: '/api/v1/users' });
app.register(adminRoutes, { prefix: '/api/v1/admin' });
app.register(agentRoutes, { prefix: '/api/v1/agents' });

// ══════════════════════════════════════════
// Graceful Shutdown
// ══════════════════════════════════════════

const shutdown = async (signal) => {
  app.log.info(`${signal} received, shutting down gracefully...`);
  try {
    await app.close();
    // Destroy caches
    chainCache.destroy();
    storeCache.destroy();
    searchCache.destroy();
    categoryCache.destroy();
    dealsCache.destroy();
    agentCache.destroy();
    app.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    app.log.error(err, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ══════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`WhereIsIt API v2.0.0 running on http://${HOST}:${PORT}`);
  app.log.info(`Database: ${isConnected() ? 'Connected' : 'Not configured'}`);
  app.log.info(`Environment: ${IS_PROD ? 'production' : 'development'}`);
  app.log.info(`45 endpoints registered across 8 route groups`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;
