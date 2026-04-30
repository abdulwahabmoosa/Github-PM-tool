import prisma from '../db/prisma.js';

export async function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  req.user = user;
  next();
}
