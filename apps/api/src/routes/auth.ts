import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import type { AdminUser } from '../types.js';

const googleClient = new OAuth2Client();

const COOKIE_NAME = 'pg_session';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

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
    const email = request.body.email.trim().toLowerCase();
    const { password } = request.body;
    const user = db.prepare('SELECT * FROM admin_users WHERE lower(email) = ?').get(email) as AdminUser | undefined;

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.status(401).send({ error: 'Email ou mot de passe incorrect' });
    }

    const token = app.jwt.sign(
      { id: user.id, email: user.email, v: user.session_version, role: 'admin' },
      { expiresIn: '7d' },
    );
    reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);
    return { email: user.email, isAdmin: true };
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  });

  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    return { user: { id: request.user.id, email: request.user.email } };
  });

  app.post<{ Body: { credential: string } }>('/google', {
    schema: {
      body: {
        type: 'object',
        required: ['credential'],
        properties: { credential: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    if (!config.googleClientId) {
      return reply.status(501).send({ error: 'Google auth not configured' });
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: request.body.credential,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) return reply.status(401).send({ error: 'Jeton Google invalide' });

      const normalizedEmail = payload.email.trim().toLowerCase();
      const isAdmin = normalizedEmail === config.adminEmail.trim().toLowerCase();

      if (isAdmin) {
        const user = db.prepare('SELECT * FROM admin_users WHERE lower(email) = ?').get(normalizedEmail) as AdminUser | undefined;
        if (!user) return reply.status(403).send({ error: 'Compte admin introuvable' });
        const token = app.jwt.sign(
          { id: user.id, email: user.email, v: user.session_version, role: 'admin' },
          { expiresIn: '7d' },
        );
        reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);
        return { email: user.email, isAdmin: true };
      }

      // Regular user — visitor cookie (no DB record needed)
      const token = app.jwt.sign({ email: normalizedEmail, role: 'user' }, { expiresIn: '7d' });
      reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);
      return { email: normalizedEmail, isAdmin: false };
    } catch {
      return reply.status(401).send({ error: 'Jeton Google invalide' });
    }
  });

  app.put<{ Body: { currentPassword: string; newPassword: string } }>('/password', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
  }, async (request, reply) => {
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(request.user.id) as AdminUser | undefined;
    if (!user) return reply.status(404).send({ error: 'Utilisateur introuvable' });

    if (!(await bcrypt.compare(request.body.currentPassword, user.password_hash))) {
      return reply.status(400).send({ error: 'Mot de passe actuel incorrect' });
    }

    const hash = await bcrypt.hash(request.body.newPassword, 12);
    // Increment session_version to invalidate all existing tokens
    db.prepare('UPDATE admin_users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?')
      .run(hash, user.id);

    // Clear current cookie — user must log in again with new password
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  });
};
