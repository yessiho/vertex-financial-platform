import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { db } from '../utils/db';

export const statsRouter = Router();
statsRouter.use(authenticate);

statsRouter.get('/', async (req, res, next) => {
  try {
    const [docs, msgs, entities, unread] = await Promise.all([
      db('documents').where({ entity_id: req.user.entity_id, is_archived: false }).count('id as count').first(),
      db('messages').where({ entity_id: req.user.entity_id, is_archived: false }).count('id as count').first(),
      db('entities').join('user_entity_access','entities.id','user_entity_access.entity_id')
        .where({ 'user_entity_access.user_id': req.user.sub, 'entities.status': 'active' }).count('entities.id as count').first(),
      db('messages').where({ entity_id: req.user.entity_id, status: 'unread', is_archived: false }).count('id as count').first(),
    ]);
    res.json({
      data: {
        total_documents: parseInt((docs as any)?.count || '0'),
        total_messages: parseInt((msgs as any)?.count || '0'),
        active_entities: parseInt((entities as any)?.count || '0'),
        unread_messages: parseInt((unread as any)?.count || '0'),
      }
    });
  } catch (err) { next(err); }
});
