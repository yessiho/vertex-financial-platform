import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';
import bcrypt from 'bcryptjs';

export class UserController {

  // GET /api/v1/users/me
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await db('users')
        .where({ id: req.user.sub })
        .select('id','email','first_name','last_name','role','mfa_enabled','is_active','last_login_at','created_at')
        .first();
      if (!user) throw new AppError('User not found', 404);
      res.json({ data: user });
    } catch (err) { next(err); }
  };

  // PATCH /api/v1/users/me
  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { first_name, last_name } = req.body;
      const [updated] = await db('users')
        .where({ id: req.user.sub })
        .update({ ...(first_name && { first_name }), ...(last_name && { last_name }), updated_at: new Date() })
        .returning('id','email','first_name','last_name','role');
      res.json({ data: updated });
    } catch (err) { next(err); }
  };

  // GET /api/v1/users
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await db('users')
        .where({ organization_id: req.user.org_id })
        .select('id','email','first_name','last_name','role','mfa_enabled','is_active','last_login_at','created_at')
        .orderBy('created_at', 'desc');
      res.json({ data: users });
    } catch (err) { next(err); }
  };

  // POST /api/v1/users (invite)
  invite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, first_name, last_name, role, entity_id } = req.body;
      if (!email || !first_name || !last_name || !role) {
        throw new AppError('email, first_name, last_name and role are required', 400);
      }

      const existing = await db('users').where({ email }).first();
      if (existing) throw new AppError('User with this email already exists', 409);

      // Temp password — in production send email invite
      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const hash = await bcrypt.hash(tempPassword, 12);

      const [user] = await db('users').insert({
        organization_id: req.user.org_id,
        email,
        first_name,
        last_name,
        role,
        password_hash: hash,
        mfa_enabled: false,
        is_active: true,
      }).returning('id','email','first_name','last_name','role','created_at');

      // Grant entity access if provided
      if (entity_id) {
        await db('user_entity_access').insert({
          user_id: user.id,
          entity_id,
          is_primary: true,
        });
      }

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        user_id: req.user.sub,
        action: 'user.invite',
        resource_type: 'user',
        resource_id: user.id,
        after: JSON.stringify({ email, role }),
      });

      res.status(201).json({
        data: user,
        temp_password: tempPassword, // show once — in prod this would be emailed
      });
    } catch (err) { next(err); }
  };

  // PATCH /api/v1/users/:userId/role
  setRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const validRoles = ['superadmin', 'admin', 'accountant', 'client'];
      if (!validRoles.includes(role)) throw new AppError('Invalid role', 400);

      const [updated] = await db('users')
        .where({ id: userId, organization_id: req.user.org_id })
        .update({ role, updated_at: new Date() })
        .returning('id','email','first_name','last_name','role');

      res.json({ data: updated });
    } catch (err) { next(err); }
  };
}
