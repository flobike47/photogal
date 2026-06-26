import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db.js';

// Accepts any valid JWT (admin or regular user).
// For admins, also validates session_version to support revocation.
export async function authenticateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    if (!request.user.email) throw new Error('No email in token');

    if (request.user.role === 'admin' && request.user.id) {
      const row = db
        .prepare('SELECT session_version FROM admin_users WHERE id = ?')
        .get(request.user.id) as { session_version: number } | undefined;
      if (!row || (request.user.v ?? 0) !== row.session_version) {
        await reply.status(401).send({ error: 'Session expirée, veuillez vous reconnecter' });
        return;
      }
    }
  } catch {
    await reply.status(401).send({ error: 'Unauthorized' });
  }
}
