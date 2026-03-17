/**
 * WhereIsIt — User Routes (Production)
 * Profile management, preferences, contribution history,
 * and saved stores.
 */

import * as db from '../services/supabase.js';
import { success, paginated, ValidationError, NotFoundError } from '../lib/errors.js';
import { parsePagination, isUUID, sanitize } from '../lib/validators.js';

export async function userRoutes(app) {

  // ══════════════════════════════════════════
  // GET /api/v1/users/:id — Get user profile
  // ══════════════════════════════════════════
  app.get('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid user ID');
    if (!db.isConnected()) throw new NotFoundError('User', id);

    const user = await db.users.getById(id);
    return success({
      user: {
        id: user.id,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        reputation_score: user.reputation_score,
        trust_level: user.trust_level,
        contributions_count: user.contributions_count,
        default_store_id: user.default_store_id,
        created_at: user.created_at,
      },
    });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/users — Register / create user
  // ══════════════════════════════════════════
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          auth_id: { type: 'string' },
          display_name: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email' },
          avatar_url: { type: 'string', maxLength: 1000 },
          default_store_id: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    if (!db.isConnected()) return success({ message: 'Database offline' });

    const body = request.body;
    if (body.display_name) body.display_name = sanitize(body.display_name);

    // Check if user already exists by auth_id
    if (body.auth_id) {
      const existing = await db.users.getByAuthId(body.auth_id);
      if (existing) return success({ user: existing, existing: true });
    }

    const user = await db.users.create({
      ...body,
      reputation_score: 0,
      trust_level: 'new',
      contributions_count: 0,
    });

    return success({ user }, { created: true });
  });

  // ══════════════════════════════════════════
  // PATCH /api/v1/users/:id — Update user profile
  // ══════════════════════════════════════════
  app.patch('/:id', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid user ID');
    if (!db.isConnected()) throw new NotFoundError('User', id);

    const allowed = ['display_name', 'avatar_url', 'default_store_id', 'preferences_json'];
    const updates = {};
    for (const key of allowed) {
      if (request.body[key] !== undefined) {
        updates[key] = key === 'display_name' ? sanitize(request.body[key]) : request.body[key];
      }
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('No fields to update');

    const user = await db.users.update(id, updates);
    return success({ user });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/users/:id/contributions — User's contributions
  // ══════════════════════════════════════════
  app.get('/:id/contributions', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid user ID');
    const { page, perPage } = parsePagination(request.query);

    if (!db.isConnected()) return paginated([], { page, perPage, total: 0 });

    const { contributions, total } = await db.contributions.list({
      page, perPage, userId: id,
    });
    return paginated(contributions, { page, perPage, total });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/users/:id/stats — User statistics
  // ══════════════════════════════════════════
  app.get('/:id/stats', async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid user ID');
    if (!db.isConnected()) return success({ stats: {} });

    const user = await db.users.getById(id);
    const { contributions: contribs, total: totalContribs } = await db.contributions.list({
      userId: id, perPage: 1,
    });

    return success({
      stats: {
        reputation: user.reputation_score,
        trust_level: user.trust_level,
        total_contributions: totalContribs,
        member_since: user.created_at,
      },
    });
  });
}
