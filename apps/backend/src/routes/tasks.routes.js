import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getAvailableTagCommands } from '../lib/tagCommands.js';
import { getAccessibleRepo, getAccessibleTask } from '../lib/access.js';
import { recordStatusChange } from '../lib/recordStatusChange.js';
import { computeActivityForTasks } from '../lib/activityCounter.js';
import { computeOverride } from '../lib/overrideWindow.js';
import { canPerform } from '../lib/permissions.js';
import { notifyUserByLogin } from '../lib/notifications.js';

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

const ZERO_ACTIVITY = { commitCount: 0, lastCommitAt: null };

async function activityFor(task) {
  const map = await computeActivityForTasks([task]);
  return map.get(task.id) ?? ZERO_ACTIVITY;
}

function serialize(task, login, activity) {
  return {
    ...task,
    availableCommands: getAvailableTagCommands(task, login),
    activity,
    override: computeOverride(task),
  };
}

router.get('/repos/:repoId/tasks', requireAuth, async (req, res) => {
  const repo = await getOwnedRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const tasks = await prisma.task.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: 'desc' },
  });
  const activityMap = await computeActivityForTasks(tasks);
  const login = req.user.githubLogin;

  res.json(tasks.map((t) => serialize(t, login, activityMap.get(t.id) ?? ZERO_ACTIVITY)));
});

router.post('/repos/:repoId/tasks', requireAuth, async (req, res) => {
  const repo = await getOwnedRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, repo, 'task.create')) {
    return res.status(403).json({ error: 'permission_denied', action: 'task.create' });
  }

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
  const activity = await activityFor(task);
  if (task.assignee && task.assignee.toLowerCase() !== req.user.githubLogin.toLowerCase()) {
    await notifyUserByLogin(task.assignee, req.user.id, {
      type: 'task_assigned',
      title: `Task #${task.repoTaskNumber} assigned to you: ${task.title}`,
      body: `In repo ${repo.fullName}`,
      linkTo: '/dashboard',
      metadata: { taskId: task.id, repoId: repo.id },
    });
  }
  res.status(201).json(serialize(task, req.user.githubLogin, activity));
});

router.get('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });
  const activity = await activityFor(task);
  res.json(serialize(task, req.user.githubLogin, activity));
});

router.get('/tasks/:id/history', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });
  const history = await prisma.statusHistory.findMany({
    where: { taskId: task.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(history);
});

router.patch('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  if (req.body.status !== undefined) {
    return res.status(400).json({ error: 'use PATCH /api/tasks/:id/status to change status' });
  }

  if (!await canPerform(req.user, task.repo, 'task.edit')) {
    return res.status(403).json({ error: 'permission_denied', action: 'task.edit' });
  }

  const result = taskUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  const oldAssignee = task.assignee;
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: result.data,
  });
  const activity = await activityFor(updated);
  const newAssignee = result.data.assignee;
  if (
    newAssignee !== undefined &&
    newAssignee &&
    newAssignee.toLowerCase() !== (oldAssignee ?? '').toLowerCase()
  ) {
    await notifyUserByLogin(newAssignee, req.user.id, {
      type: 'task_assigned',
      title: `Task #${updated.repoTaskNumber} assigned to you: ${updated.title}`,
      body: `In repo ${task.repo.fullName}`,
      linkTo: '/dashboard',
      metadata: { taskId: task.id, repoId: task.repoId },
    });
  }
  res.json(serialize(updated, req.user.githubLogin, activity));
});

router.patch('/tasks/:id/status', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, task.repo, 'task.changeStatus', task)) {
    return res.status(403).json({ error: 'permission_denied', action: 'task.changeStatus' });
  }

  const result = statusUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }

  if (task.status === result.data.status) {
    const activity = await activityFor(task);
    return res.json(serialize(task, req.user.githubLogin, activity));
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
    additionalTaskUpdates: { lastManualOverrideAt: new Date() },
  });
  const activity = await activityFor(updated);
  res.json(serialize(updated, req.user.githubLogin, activity));
});

router.delete('/tasks/:id', requireAuth, async (req, res) => {
  const task = await getOwnedTask(req.params.id, req.user.id);
  if (!task) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, task.repo, 'task.delete')) {
    return res.status(403).json({ error: 'permission_denied', action: 'task.delete' });
  }

  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).send();
});

export default router;
