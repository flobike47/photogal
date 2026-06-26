import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'admin') {
      await reply.status(403).send({ error: 'Accès réservé à l\'administrateur' });
      return;
    }
    const row = db
      .prepare('SELECT session_version FROM admin_users WHERE id = ?')
      .get(request.user.id) as { session_version: number } | undefined;
    if (!row || (request.user.v ?? 0) !== row.session_version) {
      await reply.status(401).send({ error: 'Session expirée, veuillez vous reconnecter' });
    }
  } catch {
    await reply.status(401).send({ error: 'Unauthorized' });
  }
}
