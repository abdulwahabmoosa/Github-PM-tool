import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getAvailableTagCommands } from '../lib/tagCommands.js';
import { getAccessibleRepo, getAccessibleTask } from '../lib/access.js';
import { recordStatusChange } from '../lib/recordStatusChange.js';

const router = Router();

const TASK_STATUSES = ['OPEN', 'TO_DO', 'IN_PROGRESS', 'HELP_NEEDED', 'IN_REVIEW', 'DONE'];

const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  branch: z.string().trim().max(200).optional().nullable(),
  linkedIssueNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]).optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  status: z.enum(TASK_STATUSES).optional(),
  needsHelp: z.boolean().optional(),
});

const taskUpdateSchema = taskCreateSchema.partial();

const statusUpdateSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

const getOwnedRepo = getAccessibleRepo;
const getOwnedTask = getAccessibleTask;

router.get('/repos/:repoId/tasks', requireAuth, async (req, res) => {
  const repo = await getOwnedRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const tasks = await prisma.task.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: 'desc' },
  });
  const login = req.user.githubLogin;
  res.json(tasks.map((t) => ({ ...t, availableCommands: getAvailableTagCommands(t, login) })));
});

router.post('/repos/:repoId/tasks', requireAuth, async (req, res) => {
  const repo = await getOwnedRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const result = taskCreateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  const task = await prisma.$transaction(async (tx) => {
    const max = await tx.task.aggregate({
      where: { repoId: repo.id },
      _max: { repoTaskNumber: true },
    });
    const next = (max._max.repoTaskNumber ?? 0) + 1;
    const created = await tx.task.create({
      data: { ...result.data, userId: req.user.id, repoId: repo.id, repoTaskNumber: next },
    });
    await tx.statusHistory.create({
      data: {
        taskId: created.id,
        fromStatus: null,
        toStatus: created.status,
        triggerType: 'TASK_CREATED',
        triggerVerb: null,
        triggerRef: null,
        actorLogin: req.user.githubLogin,
        automated: false,
        note: null,
      },
    });
    return created;
  });
  res.status(201).json({ ...task, availableCommands: getAvailableTagCommands(task, req.user.githubLogin) });
});

router.get('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });
  res.json({ ...task, availableCommands: getAvailableTagCommands(task, req.user.githubLogin) });
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
  res.json({ ...updated, availableCommands: getAvailableTagCommands(updated, req.user.githubLogin) });
});

router.patch('/tasks/:id/status', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  const result = statusUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  if (task.status === result.data.status) {
    return res.json({ ...task, availableCommands: getAvailableTagCommands(task, req.user.githubLogin) });
  }

  const { task: updated } = await recordStatusChange({
    taskId: task.id,
    fromStatus: task.status,
    toStatus: result.data.status,
    triggerType: 'MANUAL',
    triggerVerb: null,
    triggerRef: null,
    actorLogin: req.user.githubLogin,
    automated: false,
  });
  res.json({ ...updated, availableCommands: getAvailableTagCommands(updated, req.user.githubLogin) });
});

router.delete('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).send();
});

export default router;
