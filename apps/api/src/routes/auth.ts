import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import type { AdminUser } from '../types.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { email: string; password: string } }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;
    const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as AdminUser | undefined;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.status(401).send({ error: 'Email ou mot de passe incorrect' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '7d' });
    return { token, email: user.email };
  });

  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    return { user: request.user };
  });

  app.put<{ Body: { currentPassword: string; newPassword: string } }>('/password', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(request.user.id) as AdminUser | undefined;
    if (!user) return reply.status(404).send({ error: 'User not found' });

    if (!(await bcrypt.compare(request.body.currentPassword, user.password_hash))) {
      return reply.status(400).send({ error: 'Mot de passe actuel incorrect' });
    }

    const hash = await bcrypt.hash(request.body.newPassword, 10);
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    return { success: true };
  });
};
