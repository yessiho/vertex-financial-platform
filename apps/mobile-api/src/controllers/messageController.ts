import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { db } from '../utils/db';

export class MessageController {

  // GET /api/v1/messages
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messages = await db('messages')
        .where({ entity_id: req.user.entity_id, is_archived: false })
        .join('users', 'users.id', 'messages.sender_id')
        .select(
          'messages.*',
          db.raw("users.first_name || ' ' || users.last_name as sender_name"),
          'users.email as sender_email'
        )
        .orderBy('messages.created_at', 'desc');
      res.json({ data: messages });
    } catch (err) { next(err); }
  };

  // GET /api/v1/messages/:messageId
  getThread = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId } = req.params;
      const message = await db('messages').where({ id: messageId }).first();
      if (!message) throw new AppError('Message not found', 404);

      const replies = await db('message_replies')
        .where({ message_id: messageId })
        .join('users', 'users.id', 'message_replies.sender_id')
        .select(
          'message_replies.*',
          db.raw("users.first_name || ' ' || users.last_name as sender_name")
        )
        .orderBy('message_replies.created_at', 'asc');

      await db('messages').where({ id: messageId }).update({ status: 'read' });
      res.json({ data: { ...message, replies } });
    } catch (err) { next(err); }
  };

  // POST /api/v1/messages
  send = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subject, body, priority = 'normal' } = req.body;
      if (!subject || !body) throw new AppError('subject and body are required', 400);

      // Find assigned team for this entity
      const assignment = await db('entity_team_assignments')
        .where({ entity_id: req.user.entity_id, is_active: true })
        .first();

      const [message] = await db('messages').insert({
        entity_id: req.user.entity_id,
        sender_id: req.user.sub,
        assigned_team_id: assignment?.team_id || null,
        subject,
        body,
        priority,
        status: 'unread',
      }).returning('*');

      // TODO: Talk2CCRouter.routeMessage() when SendGrid is configured

      res.status(201).json({ data: message });
    } catch (err) { next(err); }
  };

  // POST /api/v1/messages/:messageId/reply
  reply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messageId } = req.params;
      const { body } = req.body;
      if (!body) throw new AppError('body is required', 400);

      const message = await db('messages').where({ id: messageId }).first();
      if (!message) throw new AppError('Message not found', 404);

      const isFromTeam = ['accountant', 'admin', 'superadmin'].includes(req.user.role);

      const [reply] = await db('message_replies').insert({
        message_id: messageId,
        sender_id: req.user.sub,
        body,
        is_from_team: isFromTeam,
      }).returning('*');

      await db('messages').where({ id: messageId }).update({
        status: 'unread',
        updated_at: new Date(),
      });

      res.status(201).json({ data: reply });
    } catch (err) { next(err); }
  };

  // PATCH /api/v1/messages/:messageId/read
  markRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db('messages').where({ id: req.params.messageId }).update({ status: 'read' });
      res.json({ message: 'Marked as read' });
    } catch (err) { next(err); }
  };

  // PATCH /api/v1/messages/:messageId/archive
  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await db('messages').where({ id: req.params.messageId }).update({ is_archived: true });
      res.json({ message: 'Archived' });
    } catch (err) { next(err); }
  };
}
