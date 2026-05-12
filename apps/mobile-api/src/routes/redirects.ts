import { Router } from 'express';
import { RedirectController } from '../controllers/redirectController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

export const redirectsRouter = Router();
const ctrl = new RedirectController();

redirectsRouter.get('/:entityId/:portalType', authenticate, ctrl.resolve);
redirectsRouter.use(authenticate, requireRole(['admin', 'superadmin']));
redirectsRouter.get('/', ctrl.list);
redirectsRouter.post('/', ctrl.create);
redirectsRouter.patch('/:redirectId', ctrl.update);
redirectsRouter.delete('/:redirectId', ctrl.deactivate);
