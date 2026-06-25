import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import type { ContactMessage } from '../types.js';

export const contactRoutes: FastifyPluginAsync = async (app) => {
  // Public: submit contact form
  app.post<{ Body: { name: string; email: string; message: string } }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'message'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          message: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request) => {
    const { name, email, message } = request.body;
    db.prepare(
      `INSERT INTO contact_messages (id, name, email, message, read, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    ).run(nanoid(), name, email, message, new Date().toISOString());
    return { success: true, message: 'Votre message a bien été envoyé.' };
  });

  // Admin: list all messages
  app.get('/', { preHandler: [authenticate] }, async () => {
    const messages = db
      .prepare('SELECT * FROM contact_messages ORDER BY created_at DESC')
      .all() as ContactMessage[];
    const unread = messages.filter((m) => m.read === 0).length;
    return { messages, unread };
  });

  // Admin: mark message as read
  app.put<{ Params: { id: string } }>('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const msg = db.prepare('SELECT id FROM contact_messages WHERE id = ?').get(request.params.id);
    if (!msg) return reply.status(404).send({ error: 'Message introuvable' });
    db.prepare('UPDATE contact_messages SET read = 1 WHERE id = ?').run(request.params.id);
    return { success: true };
  });

  // Admin: delete message
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    db.prepare('DELETE FROM contact_messages WHERE id = ?').run(request.params.id);
    return reply.status(204).send();
  });

  // Admin: unread count
  app.get('/unread-count', { preHandler: [authenticate] }, async () => {
    const row = db.prepare('SELECT COUNT(*) as count FROM contact_messages WHERE read = 0').get() as { count: number };
    return { count: row.count };
  });
};
