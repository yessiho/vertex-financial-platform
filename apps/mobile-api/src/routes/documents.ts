import { Router } from 'express';
import { DocumentController } from '../controllers/documentController';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import multer from 'multer';

export const documentsRouter = Router();
const ctrl = new DocumentController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

documentsRouter.post('/webhook', ctrl.handleBoxWebhook);
documentsRouter.use(authenticate);
documentsRouter.get('/meta/categories', ctrl.listCategories);
documentsRouter.get('/', ctrl.list);
documentsRouter.get('/:documentId', ctrl.getOne);
documentsRouter.post('/upload', upload.single('file'), ctrl.upload);
documentsRouter.delete('/:documentId', requireRole(['admin', 'superadmin']), ctrl.archive);
