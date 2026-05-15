import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { db } from '../../utils/db';

export const mobileRouter = Router();

// Mobile V1 — optimized single payload for app bootstrap
// GET /api/v1/mobile/bootstrap
// Returns everything the mobile app needs on first load in one request
mobileRouter.get('/bootstrap', authenticate, async (req, res, next) => {
  try {
    const [user, entities, recentMessages, recentDocs] = await Promise.all([
      db('users')
        .where({ id: req.user.sub })
        .select('id','email','first_name','last_name','role','mfa_enabled')
        .first(),

      db('entities')
        .join('user_entity_access', 'entities.id', 'user_entity_access.entity_id')
        .where('user_entity_access.user_id', req.user.sub)
        .where('entities.status', 'active')
        .select('entities.id','entities.name','entities.type','user_entity_access.is_primary'),

      db('messages')
        .where({ entity_id: req.user.entity_id, is_archived: false })
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('id','subject','status','priority','created_at'),

      db('documents')
        .where({ entity_id: req.user.entity_id, is_archived: false })
        .orderBy('created_at', 'desc')
        .limit(5)
        .select('id','name','category','size_bytes','created_at'),
    ]);

    res.json({
      data: {
        user,
        entities,
        active_entity_id: req.user.entity_id,
        recent_messages: recentMessages,
        recent_documents: recentDocs,
        unread_count: recentMessages.filter((m: any) => m.status === 'unread').length,
      }
    });
  } catch (err) { next(err); }
});

// GET /api/v1/mobile/notifications
mobileRouter.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const [unreadMessages, recentDocs] = await Promise.all([
      db('messages')
        .where({ entity_id: req.user.entity_id, status: 'unread', is_archived: false })
        .count('id as count')
        .first(),
      db('documents')
        .where({ entity_id: req.user.entity_id, is_archived: false })
        .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .count('id as count')
        .first(),
    ]);

    res.json({
      data: {
        unread_messages: parseInt((unreadMessages as any)?.count || '0'),
        new_documents_7d: parseInt((recentDocs as any)?.count || '0'),
      }
    });
  } catch (err) { next(err); }
});

// GET /api/v1/mobile/portals
// Returns portal redirect links for the active entity
mobileRouter.get('/portals', authenticate, async (req, res, next) => {
  try {
    const portals = await db('portal_redirects')
      .where({ entity_id: req.user.entity_id, is_active: true })
      .select('id','portal_type','label');

    res.json({ data: portals });
  } catch (err) { next(err); }
});
