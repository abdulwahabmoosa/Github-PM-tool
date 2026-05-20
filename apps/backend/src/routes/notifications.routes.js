import { Router } from 'express';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/notifications?limit=50&before=ISO_DATE
router.get('/notifications', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  const where = { userId: req.user.id };
  if (before) where.createdAt = { lt: before };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  res.json(notifications);
});

// GET /api/notifications/unread-count
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, readAt: null },
  });
  res.json({ count });
});

// PATCH /api/notifications/read-all — must be before /:id/read to avoid match collision
router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  const n = await prisma.notification.findUnique({
    where: { id: req.params.id },
    select: { userId: true },
  });
  if (!n) return res.status(404).json({ error: 'not_found' });
  if (n.userId !== req.user.id) return res.status(403).json({ error: 'forbidden' });

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { readAt: new Date() },
  });
  res.json(updated);
});

export default router;
