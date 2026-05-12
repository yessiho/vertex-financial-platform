import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticate } from '../middleware/authenticate';

export const messagesRouter = Router();
const ctrl = new MessageController();

messagesRouter.use(authenticate);
messagesRouter.get('/', ctrl.list);
messagesRouter.get('/:messageId', ctrl.getThread);
messagesRouter.post('/', ctrl.send);
messagesRouter.post('/:messageId/reply', ctrl.reply);
messagesRouter.patch('/:messageId/read', ctrl.markRead);
messagesRouter.patch('/:messageId/archive', ctrl.archive);
