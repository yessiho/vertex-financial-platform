import { Router } from 'express';
import { EntityController } from '../controllers/entityController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

export const entitiesRouter = Router();
const ctrl = new EntityController();

entitiesRouter.use(authenticate);
entitiesRouter.get('/',                                                    ctrl.list);
entitiesRouter.get('/:entityId',                                           ctrl.getOne);
entitiesRouter.post('/',    requireRole(['admin', 'superadmin']),           ctrl.create);
entitiesRouter.patch('/:entityId', requireRole(['admin', 'superadmin']),   ctrl.update);
entitiesRouter.delete('/:entityId', requireRole(['superadmin']),           ctrl.deactivate);
entitiesRouter.get('/:entityId/team',                                      ctrl.getAssignedTeam);
