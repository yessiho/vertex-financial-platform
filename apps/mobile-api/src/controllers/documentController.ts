import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';

// Lazy-load BoxService so app starts even without Box credentials
let boxService: any = null;
function getBoxService() {
  if (!boxService) {
    try {
      const { BoxService } = require('../../../packages/box-sdk/src/BoxService');
      boxService = BoxService.getInstance();
    } catch { boxService = { isReady: () => false }; }
  }
  return boxService;
}

export class DocumentController {

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

  listCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: ['invoice','tax_filing','payroll','bank_statement','report','contract','other'] });
    } catch (err) { next(err); }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await db('documents')
        .where({ id: req.params.documentId, entity_id: req.user.entity_id })
        .first();
      if (!doc) throw new AppError('Document not found', 404);

      // Try to get Box download URL
      let downloadUrl = null;
      const box = getBoxService();
      if (box.isReady() && !doc.box_file_id.startsWith('pending_')) {
        downloadUrl = await box.getDownloadUrl(doc.box_file_id);
      }

      res.json({ data: { ...doc, download_url: downloadUrl } });
    } catch (err) { next(err); }
  };

  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      const { category = 'other' } = req.body;

      const entity = await db('entities').where({ id: req.user.entity_id }).first();
      if (!entity) throw new AppError('Entity not found', 404);

      let boxFileId = `pending_${Date.now()}`;
      let boxFolderId = 'pending';

      // Try Box upload if configured and entity has folders
      const box = getBoxService();
      if (box.isReady() && entity.box_root_folder_id) {
        const folderIds = {
          rootFolderId:      entity.box_root_folder_id,
          documentsFolderId: entity.box_documents_folder_id,
          reportsFolderId:   entity.box_reports_folder_id,
          taxFolderId:       entity.box_tax_folder_id,
          payrollFolderId:   entity.box_payroll_folder_id,
        };

        const result = await box.uploadDocument(
          folderIds,
          category,
          req.file.originalname,
          req.file.buffer,
        );

        if (result) {
          boxFileId = result.boxFileId;
          boxFolderId = result.boxFolderId;
        }
      }

      const [doc] = await db('documents').insert({
        entity_id: req.user.entity_id,
        uploaded_by: req.user.sub,
        category,
        name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        box_file_id: boxFileId,
        box_folder_id: boxFolderId,
        is_archived: false,
      }).returning('*');

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id: req.user.entity_id,
        user_id: req.user.sub,
        action: 'document.upload',
        resource_type: 'document',
        resource_id: doc.id,
        after: JSON.stringify({ name: doc.name, category, box_file_id: boxFileId }),
      });

      res.status(201).json({
        data: doc,
        box_integrated: !boxFileId.startsWith('pending_'),
      });
    } catch (err) { next(err); }
  };

  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db('documents')
        .where({ id: req.params.documentId, entity_id: req.user.entity_id })
        .update({ is_archived: true, updated_at: new Date() });
      res.json({ message: 'Document archived' });
    } catch (err) { next(err); }
  };

  handleBoxWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['box-signature-primary'] as string;
      const timestamp = req.headers['box-delivery-timestamp'] as string;

      if (signature && process.env.BOX_WEBHOOK_SIGNATURE_KEY) {
        const box = getBoxService();
        const valid = box.verifyWebhookSignature(
          JSON.stringify(req.body),
          process.env.BOX_WEBHOOK_SIGNATURE_KEY,
          timestamp,
          signature,
        );
        if (!valid) return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      console.log('Box webhook received:', req.body?.trigger, req.body?.source?.id);
      res.json({ received: true });
    } catch (err) { next(err); }
  };
}
