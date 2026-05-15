import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/requireRole';
import { db } from '../utils/db';
import { AppError } from '../utils/AppError';

export const teamsRouter = Router();
teamsRouter.use(authenticate);

teamsRouter.get('/', async (req, res, next) => {
  try {
    const teams = await db('teams')
      .where({ organization_id: req.user.org_id })
      .orderBy('created_at', 'desc');
    res.json({ data: teams });
  } catch (err) { next(err); }
});

teamsRouter.post('/', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) throw new AppError('name and email are required', 400);
    const [team] = await db('teams').insert({
      organization_id: req.user.org_id,
      name, email,
      member_user_ids: JSON.stringify([]),
    }).returning('*');
    res.status(201).json({ data: team });
  } catch (err) { next(err); }
});

teamsRouter.post('/:teamId/assign/:entityId', requireRole(['admin', 'superadmin']), async (req, res, next) => {
  try {
    const { teamId, entityId } = req.params;
    await db('entity_team_assignments')
      .where({ entity_id: entityId })
      .update({ is_active: false });
    const [assignment] = await db('entity_team_assignments').insert({
      entity_id: entityId,
      team_id: teamId,
      is_active: true,
    }).returning('*');
    res.status(201).json({ data: assignment });
  } catch (err) { next(err); }
});
