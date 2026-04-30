import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  branch: z.string().trim().max(200).optional().nullable(),
  linkedIssueNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  status: z.enum(['OPEN', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  needsHelp: z.boolean().optional(),
});

const taskUpdateSchema = taskCreateSchema.partial();

const statusUpdateSchema = z.object({
  status: z.enum(['OPEN', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
});

async function getOwnedRepo(repoId, userId) {
  const repo = await prisma.repo.findUnique({ where: { id: repoId } });
  if (!repo || repo.userId !== userId) return null;
  return repo;
}

async function getOwnedTask(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { repo: true },
  });
  if (!task || task.repo.userId !== userId) return null;
  return task;
}

router.get('/repos/:repoId/tasks', requireAuth, async (req, res) => {
  const repo = await getOwnedRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const tasks = await prisma.task.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tasks);
});

router.post('/repos/:repoId/tasks', requireAuth, async (req, res) => {
  const repo = await getOwnedRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const result = taskCreateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  const task = await prisma.task.create({
    data: { ...result.data, userId: req.user.id, repoId: repo.id },
  });
  res.status(201).json(task);
});

router.get('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });
  res.json(task);
});

router.patch('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  if (req.body.status !== undefined) {
    return res.status(400).json({ error: 'use PATCH /api/tasks/:id/status to change status' });
  }

  const result = taskUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: result.data,
  });
  res.json(updated);
});

router.patch('/tasks/:id/status', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  const result = statusUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: result.data.status },
  });
  res.json(updated);
});

router.delete('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).send();
});

export default router;
