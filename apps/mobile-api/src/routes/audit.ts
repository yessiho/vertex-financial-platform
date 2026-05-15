import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { db } from '../utils/db';

export const auditRouter = Router();

auditRouter.use(authenticate, requireRole(['admin', 'superadmin']));

auditRouter.get('/', async (req, res, next) => {
  try {
    const logs = await db('audit_logs')
      .where({ organization_id: req.user.org_id })
      .orderBy('created_at', 'desc')
      .limit(100);
    res.json({ data: logs });
  } catch (err) { next(err); }
});
