import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';

export const usersRouter = Router();
const ctrl = new UserController();

usersRouter.use(authenticate);
usersRouter.get('/me', ctrl.getProfile);
usersRouter.patch('/me', ctrl.updateProfile);
usersRouter.get('/', requireRole(['admin', 'superadmin']), ctrl.list);
usersRouter.post('/', requireRole(['admin', 'superadmin']), ctrl.invite);
usersRouter.patch('/:userId/role', requireRole(['superadmin']), ctrl.setRole);
