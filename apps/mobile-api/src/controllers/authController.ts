import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { db } from '../utils/db';
import { AppError } from '../utils/AppError';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

function generateAccessToken(payload: object) {
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export class AuthController {

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await db('users').where({ email, is_active: true }).first();
      if (!user) throw new AppError('Invalid email or password', 401);

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) throw new AppError('Invalid email or password', 401);

      if (!user.mfa_enabled) {
        const entity = await db('user_entity_access')
          .where({ user_id: user.id, is_primary: true })
          .join('entities', 'entities.id', 'user_entity_access.entity_id')
          .select('entities.id', 'entities.organization_id')
          .first();

        const token = generateAccessToken({
          sub: user.id,
          org_id: user.organization_id,
          entity_id: entity?.id || null,
          role: user.role,
          mfa_verified: false,
        });

        return res.json({
          access_token: token,
          role: user.role,
          mfa_required: false,
          mfa_enabled: false,
        });
      }

      const tempToken = (jwt as any).sign(
        { sub: user.id, purpose: 'mfa' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      res.json({ mfa_required: true, temp_token: tempToken });
    } catch (err) { next(err); }
  };

  verifyMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { temp_token, totp_code } = req.body;
      let decoded: any;
      try { decoded = (jwt as any).verify(temp_token, JWT_SECRET); }
      catch { throw new AppError('Invalid or expired MFA token', 401); }

      if (decoded.purpose !== 'mfa') throw new AppError('Invalid token purpose', 401);

      const user = await db('users').where({ id: decoded.sub }).first();
      if (!user) throw new AppError('User not found', 404);

      const valid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: totp_code,
        window: 1,
      });
      if (!valid) throw new AppError('Invalid MFA code', 401);

      const entity = await db('user_entity_access')
        .where({ user_id: user.id, is_primary: true })
        .join('entities', 'entities.id', 'user_entity_access.entity_id')
        .select('entities.id')
        .first();

      const accessToken = generateAccessToken({
        sub: user.id,
        org_id: user.organization_id,
        entity_id: entity?.id || null,
        role: user.role,
        mfa_verified: true,
      });

      const refreshToken = generateRefreshToken();
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db('refresh_tokens').insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

      res.json({ access_token: accessToken, refresh_token: refreshToken });
    } catch (err) { next(err); }
  };

  setupMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await db('users').where({ id: req.user.sub }).first();
      if (!user) throw new AppError('User not found', 404);

      const secret = speakeasy.generateSecret({
        length: 20,
        name: encodeURIComponent('Vertex (' + user.email + ')'),
        issuer: 'VertexFinancial',
      });

      await db('users').where({ id: user.id }).update({ mfa_secret: secret.base32 });

      const otpauthUrl = secret.otpauth_url!;
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      res.json({ secret: secret.base32, qr_code: qrCodeDataUrl });
    } catch (err) {
      console.error('MFA setup error:', err);
      next(err);
    }
  };

  confirmMfa = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { totp_code } = req.body;
      const user = await db('users').where({ id: req.user.sub }).first();
      if (!user) throw new AppError('User not found', 404);
      if (!user.mfa_secret) throw new AppError('MFA setup not started', 400);

      const valid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: totp_code,
        window: 1,
      });
      if (!valid) throw new AppError('Invalid MFA code — please try again', 401);

      await db('users').where({ id: user.id }).update({ mfa_enabled: true });
      res.json({ message: 'MFA enabled successfully' });
    } catch (err) { next(err); }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      const stored = await db('refresh_tokens')
        .where({ token_hash: tokenHash, is_revoked: false })
        .where('expires_at', '>', new Date())
        .first();
      if (!stored) throw new AppError('Invalid or expired refresh token', 401);

      const user = await db('users').where({ id: stored.user_id }).first();
      if (!user || !user.is_active) throw new AppError('User not found', 401);

      const entity = await db('user_entity_access')
        .where({ user_id: user.id, is_primary: true })
        .join('entities', 'entities.id', 'user_entity_access.entity_id')
        .select('entities.id').first();

      const accessToken = generateAccessToken({
        sub: user.id,
        org_id: user.organization_id,
        entity_id: entity?.id || null,
        role: user.role,
        mfa_verified: true,
      });
      res.json({ access_token: accessToken });
    } catch (err) { next(err); }
  };

  switchEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entity_id } = req.body;
      const access = await db('user_entity_access')
        .where({ user_id: req.user.sub, entity_id }).first();
      if (!access) throw new AppError('Access denied to this entity', 403);

      const entity = await db('entities').where({ id: entity_id, status: 'active' }).first();
      if (!entity) throw new AppError('Entity not found or inactive', 404);

      const newToken = generateAccessToken({
        sub: req.user.sub,
        org_id: req.user.org_id,
        entity_id,
        role: req.user.role,
        mfa_verified: true,
      });

      await db('audit_logs').insert({
        organization_id: req.user.org_id,
        entity_id,
        user_id: req.user.sub,
        action: 'entity.switch',
        resource_type: 'entity',
        resource_id: entity_id,
      });

      res.json({ access_token: newToken, entity_id });
    } catch (err) { next(err); }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db('refresh_tokens')
        .where({ user_id: req.user.sub })
        .update({ is_revoked: true });
      res.json({ message: 'Logged out successfully' });
    } catch (err) { next(err); }
  };
}
