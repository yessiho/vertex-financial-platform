import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();
const ctrl = new AuthController();

// Public routes — no auth required
authRouter.post('/login', ctrl.login);
authRouter.post('/mfa/verify', ctrl.verifyMfa);
authRouter.post('/refresh', ctrl.refresh);

// Protected routes — require valid JWT
authRouter.post('/mfa/setup', authenticate, ctrl.setupMfa);
authRouter.post('/mfa/confirm', authenticate, ctrl.confirmMfa);
authRouter.post('/entity-switch', authenticate, ctrl.switchEntity);
authRouter.post('/logout', authenticate, ctrl.logout);
