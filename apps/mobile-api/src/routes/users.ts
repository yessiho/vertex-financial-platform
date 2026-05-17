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

usersRouter.patch('/me/password', async (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { db } = require('../utils/db');
    const { AppError } = require('../utils/AppError');
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) throw new AppError('current_password and new_password required', 400);
    if (new_password.length < 8) throw new AppError('Password must be at least 8 characters', 400);
    const user = await db('users').where({ id: req.user.sub }).first();
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 401);
    const hash = await bcrypt.hash(new_password, 12);
    await db('users').where({ id: req.user.sub }).update({ password_hash: hash, updated_at: new Date() });
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
});
