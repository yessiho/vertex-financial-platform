import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';
import bcrypt from 'bcryptjs';

export class UserController {

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

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { first_name, last_name } = req.body;
      const [updated] = await db('users')
        .where({ id: req.user.sub })
        .update({
          ...(first_name && { first_name }),
          ...(last_name && { last_name }),
          updated_at: new Date(),
        })
        .returning(['id','email','first_name','last_name','role']);
      res.json({ data: updated });
    } catch (err) { next(err); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await db('users')
        .where({ organization_id: req.user.org_id })
        .select('id','email','first_name','last_name','role','mfa_enabled','is_active','last_login_at','created_at')
        .orderBy('created_at', 'desc');
      res.json({ data: users });
    } catch (err) { next(err); }
  };

  invite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, first_name, last_name, role, entity_id } = req.body;
      if (!email || !first_name || !last_name || !role) {
        throw new AppError('email, first_name, last_name and role are required', 400);
      }

      const existing = await db('users').where({ email }).first();
      if (existing) throw new AppError('User with this email already exists', 409);

      const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const hash = await bcrypt.hash(tempPassword, 12);

      const [user] = await db('users')
        .insert({
          organization_id: req.user.org_id,
          email,
          first_name,
          last_name,
          role,
          password_hash: hash,
          mfa_enabled: false,
          is_active: true,
        })
        .returning(['id','email','first_name','last_name','role','created_at']);

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

      // Send welcome email via SendGrid if configured
      if (process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM) {
        try {
          const sgMail = require('@sendgrid/mail');
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          await sgMail.send({
            to: email,
            from: { email: process.env.EMAIL_FROM, name: 'Vertex Financial' },
            subject: 'Welcome to Vertex Financial Portal',
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:#000;padding:20px 24px;border-radius:8px 8px 0 0;">
                  <h1 style="color:#fff;font-size:20px;margin:0;">Welcome to Vertex Financial</h1>
                </div>
                <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                  <p>Hi ${first_name},</p>
                  <p>Your account has been created. Here are your login credentials:</p>
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                    <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
                    <p style="margin:0 0 8px;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
                    <p style="margin:0;"><strong>Role:</strong> ${role}</p>
                  </div>
                  <p>Please log in and change your password immediately.</p>
                  <a href="${process.env.WEB_PORTAL_URL || 'https://web-portal-nu-plum.vercel.app'}/login"
                    style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;">
                    Log in to Portal
                  </a>
                  <p style="color:#6b7280;font-size:12px;margin-top:24px;">
                    This is an automated message from Vertex Financial Portal.
                  </p>
                </div>
              </div>
            `,
          });
          console.log(`Welcome email sent to ${email}`);
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr);
          // Don't fail the invite if email fails
        }
      }

      res.status(201).json({ data: user, temp_password: tempPassword });
    } catch (err) { next(err); }
  };

  setRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const validRoles = ['superadmin','admin','accountant','client'];
      if (!validRoles.includes(role)) throw new AppError('Invalid role', 400);

      const [updated] = await db('users')
        .where({ id: userId, organization_id: req.user.org_id })
        .update({ role, updated_at: new Date() })
        .returning(['id','email','first_name','last_name','role']);

      res.json({ data: updated });
    } catch (err) { next(err); }
  };
}
