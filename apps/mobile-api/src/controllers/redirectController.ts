import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';

export class RedirectController {

  // GET /api/v1/redirects
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redirects = await db('portal_redirects')
        .join('entities', 'entities.id', 'portal_redirects.entity_id')
        .where('entities.organization_id', req.user.org_id)
        .select(
          'portal_redirects.*',
          'entities.name as entity_name'
        )
        .orderBy('portal_redirects.created_at', 'desc');
      res.json({ data: redirects });
    } catch (err) { next(err); }
  };

  // GET /api/v1/redirects/:entityId/:portalType
  resolve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, portalType } = req.params;
      const access = await db('user_entity_access')
        .where({ user_id: req.user.sub, entity_id: entityId })
        .first();
      if (!access) throw new AppError('Access denied', 403);

      const redirect = await db('portal_redirects')
        .where({ entity_id: entityId, portal_type: portalType, is_active: true })
        .first();
      if (!redirect) throw new AppError('No redirect configured for this portal', 404);

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id: entityId,
        user_id: req.user.sub,
        action: 'redirect.resolve',
        resource_type: 'portal_redirect',
        resource_id: redirect.id,
      });

      res.json({ data: { target_url: redirect.target_url, label: redirect.label } });
    } catch (err) { next(err); }
  };

  // POST /api/v1/redirects
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entity_id, portal_type, label, target_url } = req.body;
      if (!entity_id || !portal_type || !label || !target_url) {
        throw new AppError('entity_id, portal_type, label and target_url are required', 400);
      }

      const entity = await db('entities')
        .where({ id: entity_id, organization_id: req.user.org_id })
        .first();
      if (!entity) throw new AppError('Entity not found', 404);

      // Deactivate existing rule for same entity+type
      await db('portal_redirects')
        .where({ entity_id, portal_type, is_active: true })
        .update({ is_active: false });

      const [redirect] = await db('portal_redirects').insert({
        entity_id,
        portal_type,
        label,
        target_url,
        is_active: true,
        version: 1,
        updated_by: req.user.sub,
      }).returning('*');

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id,
        user_id: req.user.sub,
        action: 'redirect.create',
        resource_type: 'portal_redirect',
        resource_id: redirect.id,
        after: JSON.stringify(redirect),
      });

      res.status(201).json({ data: redirect });
    } catch (err) { next(err); }
  };

  // PATCH /api/v1/redirects/:redirectId
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { redirectId } = req.params;
      const { target_url, label } = req.body;

      const existing = await db('portal_redirects').where({ id: redirectId }).first();
      if (!existing) throw new AppError('Redirect not found', 404);

      const [updated] = await db('portal_redirects')
        .where({ id: redirectId })
        .update({
          ...(target_url && { target_url }),
          ...(label && { label }),
          version: existing.version + 1,
          updated_by: req.user.sub,
          updated_at: new Date(),
        }).returning('*');

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id: existing.entity_id,
        user_id: req.user.sub,
        action: 'redirect.update',
        resource_type: 'portal_redirect',
        resource_id: redirectId,
        before: JSON.stringify(existing),
        after: JSON.stringify(updated),
      });

      res.json({ data: updated });
    } catch (err) { next(err); }
  };

  // DELETE /api/v1/redirects/:redirectId
  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { redirectId } = req.params;
      await db('portal_redirects').where({ id: redirectId }).update({ is_active: false });
      res.json({ message: 'Redirect deactivated' });
    } catch (err) { next(err); }
  };
}
