/**
 * WhereIsIt — Community Routes (Production)
 * Community submissions, contribution moderation,
 * user reputation, leaderboard, and voting.
 */

import * as db from '../services/supabase.js';
import { Agents } from '../agents/pipeline.js';
import { success, paginated, ValidationError, NotFoundError } from '../lib/errors.js';
import { parsePagination, sanitize, validateLocationSubmission, isUUID } from '../lib/validators.js';

export async function communityRoutes(app) {

  // ══════════════════════════════════════════
  // POST /api/v1/community/submit — Submit product location
  // ══════════════════════════════════════════
  app.post('/submit', {
    schema: {
      body: {
        type: 'object',
        required: ['product_name', 'aisle_number', 'store_id'],
        properties: {
          product_name: { type: 'string', minLength: 1, maxLength: 200 },
          aisle_number: { type: 'string', minLength: 1, maxLength: 10 },
          department: { type: 'string', maxLength: 100 },
          brand: { type: 'string', maxLength: 100 },
          store_id: { type: 'string' },
          location_detail: { type: 'string', maxLength: 200 },
          is_temporary: { type: 'boolean', default: false },
          notes: { type: 'string', maxLength: 500 },
          photo_url: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (request) => {
    const body = request.body;

    // Validate
    const errors = validateLocationSubmission(body);
    if (errors) throw new ValidationError('Submission invalid', errors);

    // Run Content Moderation Agent
    let moderationResult = null;
    try {
      moderationResult = await Agents.contentModeration(
        sanitize(body.product_name),
        sanitize(body.aisle_number),
        sanitize(body.notes || ''),
        body.photo_url
      );
    } catch (err) {
      request.log.warn({ err }, 'Moderation agent failed, proceeding with manual review');
    }

    const isAutoApproved = moderationResult?.data?.action === 'auto_approve';
    const isRejected = moderationResult?.data?.action === 'reject';

    if (isRejected) {
      return success({
        submitted: false,
        reason: moderationResult.data.reason || 'Submission rejected by content policy',
      });
    }

    if (!db.isConnected()) {
      return success({ submitted: true, status: 'pending', requiresDatabase: true });
    }

    // Create contribution record
    const contribution = await db.contributions.create({
      store_id: body.store_id,
      type: 'product_location',
      product_name: sanitize(body.product_name),
      aisle_number: body.aisle_number,
      department: body.department ? sanitize(body.department) : null,
      brand: body.brand ? sanitize(body.brand) : null,
      location_detail: body.location_detail ? sanitize(body.location_detail) : null,
      is_temporary: body.is_temporary,
      notes: body.notes ? sanitize(body.notes) : null,
      photo_url: body.photo_url,
      status: isAutoApproved ? 'approved' : 'pending',
      moderation_data: moderationResult?.data || null,
    });

    // If auto-approved, also create the product location entry
    if (isAutoApproved) {
      try {
        await db.productLocations.create({
          store_id: body.store_id,
          product_name: sanitize(body.product_name),
          aisle_number: body.aisle_number,
          department: body.department,
          location_detail: body.location_detail,
          is_temporary: body.is_temporary,
          confidence: 0.7,
          source: 'community',
          verified_count: 1,
          contribution_id: contribution.id,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to create product location from approved contribution');
      }
    }

    return success({
      submitted: true,
      contribution_id: contribution.id,
      status: contribution.status,
      auto_approved: isAutoApproved,
    });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/community/contributions — List contributions
  // ══════════════════════════════════════════
  app.get('/contributions', async (request) => {
    const { page, perPage } = parsePagination(request.query);
    const { status, store_id, user_id, type } = request.query;

    if (!db.isConnected()) return paginated([], { page, perPage, total: 0 });

    const { contributions, total } = await db.contributions.list({
      page, perPage, status, storeId: store_id, userId: user_id, type,
    });
    return paginated(contributions, { page, perPage, total });
  });

  // ══════════════════════════════════════════
  // PATCH /api/v1/community/contributions/:id — Moderate contribution
  // ══════════════════════════════════════════
  app.patch('/contributions/:id', {
    schema: {
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['approved', 'rejected', 'flagged'] },
          reviewer_notes: { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    if (!isUUID(id)) throw new ValidationError('Invalid contribution ID');
    if (!db.isConnected()) throw new NotFoundError('Contribution', id);

    const updated = await db.contributions.updateStatus(id, request.body.status);

    // If approved, create the product location
    if (request.body.status === 'approved' && updated.product_name) {
      try {
        await db.productLocations.create({
          store_id: updated.store_id,
          product_name: updated.product_name,
          aisle_number: updated.aisle_number,
          department: updated.department,
          confidence: 0.75,
          source: 'community_reviewed',
          verified_count: 1,
          contribution_id: id,
        });
      } catch (err) {
        request.log.warn({ err }, 'Failed to create product location');
      }
    }

    return success({ contribution: updated });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/community/stats — Community statistics
  // ══════════════════════════════════════════
  app.get('/stats', async (request) => {
    const { store_id } = request.query;
    if (!db.isConnected()) return success({ stats: { pending: 0, approved: 0 } });

    const stats = await db.contributions.getStats(store_id);
    return success({ stats });
  });

  // ══════════════════════════════════════════
  // POST /api/v1/community/vote — Vote on a product location
  // ══════════════════════════════════════════
  app.post('/vote', {
    schema: {
      body: {
        type: 'object',
        required: ['location_id', 'vote'],
        properties: {
          location_id: { type: 'string' },
          vote: { type: 'string', enum: ['up', 'down'] },
        },
      },
    },
  }, async (request) => {
    const { location_id, vote } = request.body;
    if (!isUUID(location_id)) throw new ValidationError('Invalid location_id');
    if (!db.isConnected()) return success({ recorded: false });

    if (vote === 'up') {
      await db.productLocations.incrementVerified(location_id);
    } else {
      await db.productLocations.decreaseConfidence(location_id, 0.03);
    }

    return success({ recorded: true, vote });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/community/leaderboard — Top contributors
  // ══════════════════════════════════════════
  app.get('/leaderboard', async (request) => {
    const limit = parseInt(request.query.limit || '25');
    if (!db.isConnected()) return success({ leaders: [] });

    const leaders = await db.users.getLeaderboard({ limit });
    return success({ leaders, count: leaders?.length || 0 });
  });

  // ══════════════════════════════════════════
  // GET /api/v1/community/review-queue — Items needing review
  // ══════════════════════════════════════════
  app.get('/review-queue', async (request) => {
    const limit = parseInt(request.query.limit || '20');
    if (!db.isConnected()) return success({ items: [] });

    const items = await db.productLocations.getNeedsReview({ limit });
    return success({ items, count: items?.length || 0 });
  });
}
