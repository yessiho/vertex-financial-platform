import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';

export class DocumentController {

  // GET /api/v1/documents
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.query;
      let query = db('documents')
        .where({ entity_id: req.user.entity_id, is_archived: false })
        .join('users', 'users.id', 'documents.uploaded_by')
        .select(
          'documents.*',
          db.raw("users.first_name || ' ' || users.last_name as uploaded_by_name")
        )
        .orderBy('documents.created_at', 'desc');

      if (category) query = query.where('documents.category', category as string);

      const documents = await query;
      res.json({ data: documents });
    } catch (err) { next(err); }
  };

  // GET /api/v1/documents/meta/categories
  listCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = ['invoice','tax_filing','payroll','bank_statement','report','contract','other'];
      res.json({ data: categories });
    } catch (err) { next(err); }
  };

  // GET /api/v1/documents/:documentId
  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await db('documents')
        .where({ id: req.params.documentId, entity_id: req.user.entity_id })
        .first();
      if (!doc) throw new AppError('Document not found', 404);

      // TODO: generate Box pre-auth download link when Box is configured
      res.json({ data: { ...doc, download_url: null } });
    } catch (err) { next(err); }
  };

  // POST /api/v1/documents/upload
  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      const { category = 'other' } = req.body;

      // TODO: BoxService.uploadDocument() when Box is configured
      // For now store metadata with a placeholder box_file_id
      const [doc] = await db('documents').insert({
        entity_id: req.user.entity_id,
        uploaded_by: req.user.sub,
        category,
        name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        box_file_id: `pending_${Date.now()}`,
        box_folder_id: `pending`,
        is_archived: false,
      }).returning('*');

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id: req.user.entity_id,
        user_id: req.user.sub,
        action: 'document.upload',
        resource_type: 'document',
        resource_id: doc.id,
        after: JSON.stringify({ name: doc.name, category }),
      });

      res.status(201).json({ data: doc });
    } catch (err) { next(err); }
  };

  // DELETE /api/v1/documents/:documentId
  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db('documents')
        .where({ id: req.params.documentId, entity_id: req.user.entity_id })
        .update({ is_archived: true, updated_at: new Date() });
      res.json({ message: 'Document archived' });
    } catch (err) { next(err); }
  };

  // POST /api/v1/documents/webhook (Box webhook)
  handleBoxWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: verify Box webhook signature
      // BoxService.verifyWebhookSignature(...)
      console.log('Box webhook received:', req.body?.trigger);
      res.json({ received: true });
    } catch (err) { next(err); }
  };
}
