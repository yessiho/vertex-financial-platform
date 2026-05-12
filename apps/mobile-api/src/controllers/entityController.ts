import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';

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

export class EntityController {

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entities = await db('entities')
        .join('user_entity_access', 'entities.id', 'user_entity_access.entity_id')
        .where('user_entity_access.user_id', req.user.sub)
        .where('entities.status', 'active')
        .select(
          'entities.id', 'entities.name', 'entities.type', 'entities.status',
          'entities.tax_id', 'entities.metadata', 'entities.created_at',
          'user_entity_access.is_primary'
        )
        .orderBy('user_entity_access.is_primary', 'desc');
      res.json({ data: entities });
    } catch (err) { next(err); }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const access = await db('user_entity_access')
        .where({ user_id: req.user.sub, entity_id: entityId }).first();
      if (!access) throw new AppError('Entity not found or access denied', 404);
      const entity = await db('entities').where({ id: entityId }).first();
      if (!entity) throw new AppError('Entity not found', 404);
      res.json({ data: entity });
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, type, tax_id, metadata } = req.body;
      if (!name || !type) throw new AppError('name and type are required', 400);

      const validTypes = ['llc','corporation','sole_proprietor','partnership','trust'];
      if (!validTypes.includes(type)) throw new AppError(`type must be one of: ${validTypes.join(', ')}`, 400);

      const [entity] = await db('entities').insert({
        organization_id: req.user.org_id,
        name, type,
        tax_id: tax_id || null,
        status: 'active',
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      }).returning('*');

      await db('user_entity_access').insert({
        user_id: req.user.sub,
        entity_id: entity.id,
        is_primary: false,
      });

      // Auto-provision Box folders if configured
      const box = getBoxService();
      if (box.isReady()) {
        const folders = await box.provisionEntityFolders(entity.id, name);
        if (folders) {
          await db('entities').where({ id: entity.id }).update({
            box_root_folder_id:      folders.rootFolderId,
            box_documents_folder_id: folders.documentsFolderId,
            box_reports_folder_id:   folders.reportsFolderId,
            box_tax_folder_id:       folders.taxFolderId,
            box_payroll_folder_id:   folders.payrollFolderId,
          });
          entity.box_root_folder_id = folders.rootFolderId;
        }
      }

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id: entity.id,
        user_id: req.user.sub,
        action: 'entity.create',
        resource_type: 'entity',
        resource_id: entity.id,
        after: JSON.stringify(entity),
      });

      res.status(201).json({
        data: entity,
        box_provisioned: !!entity.box_root_folder_id,
      });
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const { name, tax_id, metadata } = req.body;
      const entity = await db('entities')
        .where({ id: entityId, organization_id: req.user.org_id }).first();
      if (!entity) throw new AppError('Entity not found', 404);
      const [updated] = await db('entities').where({ id: entityId }).update({
        ...(name && { name }),
        ...(tax_id !== undefined && { tax_id }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
        updated_at: new Date(),
      }).returning('*');
      res.json({ data: updated });
    } catch (err) { next(err); }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const entity = await db('entities')
        .where({ id: entityId, organization_id: req.user.org_id }).first();
      if (!entity) throw new AppError('Entity not found', 404);
      await db('entities').where({ id: entityId }).update({ status: 'inactive', updated_at: new Date() });
      res.json({ message: 'Entity deactivated successfully' });
    } catch (err) { next(err); }
  };

  getAssignedTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const assignment = await db('entity_team_assignments')
        .where({ entity_id: entityId, is_active: true })
        .join('teams', 'teams.id', 'entity_team_assignments.team_id')
        .select('teams.*').first();
      res.json({ data: assignment || null });
    } catch (err) { next(err); }
  };
}
