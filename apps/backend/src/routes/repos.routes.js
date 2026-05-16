import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { pollRepo } from '../lib/githubPoller.js';
import { getAccessibleRepo } from '../lib/access.js';
import { ensureRuleConfig } from '../lib/ruleConfig.js';
import { canPerform } from '../lib/permissions.js';
import { createNotification, notifyRepoMembers } from '../lib/notifications.js';
import { syncRepoMembers } from '../lib/syncMembers.js';

const router = Router();

const connectSchema = z.object({
  githubRepoId: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  private: z.boolean(),
  defaultBranch: z.string(),
});

function formatRepo(repo, myRole) {
  return {
    id: repo.id,
    githubRepoId: String(repo.githubRepoId),
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    private: repo.private,
    defaultBranch: repo.defaultBranch,
    connectedAt: repo.connectedAt,
    connectedByUserId: repo.connectedByUserId,
    mode: repo.mode,
    myAccess: { role: myRole },
    syncState: repo.syncState
      ? {
          lastPolledAt: repo.syncState.lastPolledAt,
          lastPollStatus: repo.syncState.lastPollStatus,
          lastPollError: repo.syncState.lastPollError,
        }
      : null,
  };
}

router.get('/repos', requireAuth, async (req, res) => {
  const accesses = await prisma.repoAccess.findMany({
    where: { userId: req.user.id },
    include: { repo: { include: { syncState: true } } },
    orderBy: { grantedAt: 'desc' },
  });
  res.json(accesses.map((a) => formatRepo(a.repo, a.role)));
});

router.post('/repos/connect', requireAuth, async (req, res) => {
  const result = connectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }
  const { githubRepoId, owner, name, fullName, private: isPrivate, defaultBranch } = result.data;

  const existingRepo = await prisma.repo.findUnique({
    where: { githubRepoId },
    include: { syncState: true },
  });

  if (existingRepo) {
    const existingAccess = await prisma.repoAccess.findUnique({
      where: { userId_repoId: { userId: req.user.id, repoId: existingRepo.id } },
    });

    if (existingAccess) {
      return res.status(200).json(formatRepo(existingRepo, existingAccess.role));
    }

    // New member joining an existing repo
    await prisma.repoAccess.create({
      data: { userId: req.user.id, repoId: existingRepo.id, role: 'MEMBER' },
    });
    return res.status(201).json(formatRepo(existingRepo, 'MEMBER'));
  }

  // First-ever connection of this repo to TaskMaster
  const { repo, access } = await prisma.$transaction(async (tx) => {
    const repo = await tx.repo.create({
      data: {
        connectedByUserId: req.user.id,
        githubRepoId,
        owner,
        name,
        fullName,
        private: isPrivate,
        defaultBranch,
      },
    });
    await tx.syncState.create({ data: { repoId: repo.id } });
    const access = await tx.repoAccess.create({
      data: { userId: req.user.id, repoId: repo.id, role: 'ADMIN' },
    });
    return { repo, access };
  });

  await ensureRuleConfig(repo.id);
  res.status(201).json(formatRepo(repo, access.role));
});

router.delete('/repos/:id', requireAuth, async (req, res) => {
  const accessRow = await prisma.repoAccess.findUnique({
    where: { userId_repoId: { userId: req.user.id, repoId: req.params.id } },
    include: { repo: true },
  });
  if (!accessRow) return res.status(404).json({ error: 'not_found' });

  const isOwner = accessRow.repo.connectedByUserId === req.user.id;

  if (!isOwner) {
    // Non-owner: if they're the last admin, promote oldest remaining member first
    if (accessRow.role === 'ADMIN') {
      const otherAdmins = await prisma.repoAccess.findMany({
        where: { repoId: req.params.id, role: 'ADMIN', NOT: { userId: req.user.id } },
      });
      if (otherAdmins.length === 0) {
        const oldest = await prisma.repoAccess.findFirst({
          where: { repoId: req.params.id, NOT: { userId: req.user.id } },
          orderBy: { grantedAt: 'asc' },
        });
        if (oldest) {
          await prisma.repoAccess.update({ where: { id: oldest.id }, data: { role: 'ADMIN' } });
        }
      }
    }
    await prisma.repoAccess.delete({ where: { id: accessRow.id } });
    return res.status(204).send();
  }

  // Owner disconnect
  const otherMembers = await prisma.repoAccess.findMany({
    where: { repoId: req.params.id, NOT: { userId: req.user.id } },
    orderBy: { grantedAt: 'asc' },
  });

  if (otherMembers.length === 0) {
    await prisma.repo.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  }

  // Transfer ownership to oldest remaining member (promote to ADMIN)
  const newOwner = otherMembers[0];
  await prisma.$transaction([
    prisma.repoAccess.update({ where: { id: newOwner.id }, data: { role: 'ADMIN' } }),
    prisma.repo.update({ where: { id: req.params.id }, data: { connectedByUserId: newOwner.userId } }),
    prisma.repoAccess.delete({ where: { id: accessRow.id } }),
  ]);
  return res.status(204).send();
});

router.post('/repos/:repoId/poll-now', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });
  try {
    const result = await pollRepo(repo.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'poll_failed', details: err.message });
  }
});

// ── Mode ──────────────────────────────────────────────────────────────────────

router.patch('/repos/:repoId/mode', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, repo, 'repo.switchMode')) {
    return res.status(403).json({ error: 'permission_denied', action: 'repo.switchMode' });
  }

  const { mode } = req.body;
  if (mode !== 'OPEN' && mode !== 'ADMIN') {
    return res.status(400).json({ error: 'invalid_mode' });
  }

  const updated = await prisma.repo.update({
    where: { id: repo.id },
    data: { mode },
  });

  await notifyRepoMembers(repo.id, null, req.user.id, {
    type: 'repo_mode_changed',
    title: `${repo.fullName} switched to ${mode} mode`,
    linkTo: `/repos/${repo.id}/settings`,
    metadata: { repoId: repo.id, mode, switchedBy: req.user.githubLogin },
  });

  res.json({ id: updated.id, mode: updated.mode });
});

// ── Members ───────────────────────────────────────────────────────────────────

router.get('/repos/:repoId/members', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  // Sync with GitHub before returning the member list
  const forceFresh = req.query.fresh === 'true';
  const syncResult = await syncRepoMembers(repo.id, { forceFresh });

  const accesses = await prisma.repoAccess.findMany({
    where: { repoId: repo.id },
    include: { user: { select: { id: true, githubLogin: true, avatarUrl: true } } },
    orderBy: { grantedAt: 'asc' },
  });

  const active = accesses.map((a) => ({
    userId: a.user.id,
    githubLogin: a.user.githubLogin,
    avatarUrl: a.user.avatarUrl,
    role: a.role,
    isOwner: a.userId === repo.connectedByUserId,
    joinedAt: a.grantedAt.toISOString(),
  }));

  // Build "available to add": GitHub collaborators who have a TaskMaster account
  // but are not yet in this repo's access list
  const activeLogins = new Set(accesses.map((a) => a.user.githubLogin.toLowerCase()));
  const collaboratorLogins = syncResult?.collaboratorLogins ?? new Set();
  const availableLogins = [...collaboratorLogins].filter((l) => !activeLogins.has(l));

  const availableUsers = availableLogins.length > 0
    ? await prisma.user.findMany({
        where: { githubLogin: { in: availableLogins, mode: 'insensitive' } },
        select: { id: true, githubLogin: true, avatarUrl: true },
      })
    : [];

  res.json({
    active,
    available: availableUsers.map((u) => ({
      userId: u.id,
      githubLogin: u.githubLogin,
      avatarUrl: u.avatarUrl,
    })),
    ownerNotInGitHub: syncResult?.ownerNotInGitHub ?? false,
    removedCount: syncResult?.removedUserIds?.length ?? 0,
  });
});

router.post('/repos/:repoId/members', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, repo, 'repo.manageMembers')) {
    return res.status(403).json({ error: 'permission_denied', action: 'repo.manageMembers' });
  }

  const { githubLogin } = req.body;
  if (!githubLogin || typeof githubLogin !== 'string') {
    return res.status(400).json({ error: 'invalid_login' });
  }

  // Verify they're a GitHub collaborator
  const syncResult = await syncRepoMembers(repo.id);
  const isCollaborator = syncResult?.collaboratorLogins?.has(githubLogin.toLowerCase());
  if (!isCollaborator) {
    return res.status(400).json({
      error: 'not_a_collaborator',
      message: 'User is not a GitHub collaborator on this repo.',
    });
  }

  // Find their TaskMaster account
  const targetUser = await prisma.user.findFirst({
    where: { githubLogin: { equals: githubLogin, mode: 'insensitive' } },
  });
  if (!targetUser) {
    return res.status(400).json({
      error: 'user_not_signed_up',
      message: 'User must sign in to TaskMaster first.',
    });
  }

  // Check if already a member
  const existing = await prisma.repoAccess.findFirst({
    where: { repoId: repo.id, userId: targetUser.id },
  });
  if (existing) {
    return res.status(409).json({ error: 'already_member' });
  }

  await prisma.repoAccess.create({
    data: { repoId: repo.id, userId: targetUser.id, role: 'MEMBER' },
  });

  await createNotification({
    userId: targetUser.id,
    type: 'repo_access_granted',
    title: `You were added to ${repo.fullName}`,
    body: 'You can now manage tasks for this repository.',
    linkTo: '/dashboard',
    metadata: { repoId: repo.id, repoName: repo.fullName, addedBy: req.user.githubLogin },
  });

  res.status(201).json({ userId: targetUser.id, githubLogin: targetUser.githubLogin });
});

router.patch('/repos/:repoId/members/:userId/role', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, repo, 'repo.manageMembers')) {
    return res.status(403).json({ error: 'permission_denied', action: 'repo.manageMembers' });
  }

  const { role } = req.body;
  if (role !== 'MEMBER' && role !== 'ADMIN') {
    return res.status(400).json({ error: 'invalid_role' });
  }

  const targetAccess = await prisma.repoAccess.findUnique({
    where: { userId_repoId: { userId: req.params.userId, repoId: repo.id } },
  });
  if (!targetAccess) return res.status(404).json({ error: 'member_not_found' });

  // Last-admin guard: prevent demoting if it would leave 0 admins
  if (role === 'MEMBER' && targetAccess.role === 'ADMIN') {
    const adminCount = await prisma.repoAccess.count({
      where: { repoId: repo.id, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'last_admin', message: 'Cannot demote the last admin. Promote someone else first.' });
    }
  }

  const oldRole = targetAccess.role;
  const updated = await prisma.repoAccess.update({
    where: { id: targetAccess.id },
    data: { role },
    include: { user: { select: { id: true, githubLogin: true, avatarUrl: true } } },
  });

  if (role === 'ADMIN' && oldRole !== 'ADMIN') {
    await createNotification({
      userId: req.params.userId,
      type: 'role_promoted',
      title: `You are now ADMIN in ${repo.fullName}`,
      linkTo: `/repos/${repo.id}/settings`,
      metadata: { repoId: repo.id },
    });
  } else if (role === 'MEMBER' && oldRole !== 'MEMBER') {
    await createNotification({
      userId: req.params.userId,
      type: 'role_demoted',
      title: `You are now MEMBER in ${repo.fullName}`,
      linkTo: `/repos/${repo.id}/settings`,
      metadata: { repoId: repo.id },
    });
  }

  res.json({
    userId: updated.user.id,
    githubLogin: updated.user.githubLogin,
    avatarUrl: updated.user.avatarUrl,
    role: updated.role,
    isOwner: updated.userId === repo.connectedByUserId,
    joinedAt: updated.grantedAt.toISOString(),
  });
});

router.delete('/repos/:repoId/members/:userId', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, repo, 'repo.manageMembers')) {
    return res.status(403).json({ error: 'permission_denied', action: 'repo.manageMembers' });
  }

  // Cannot remove the repo owner via this endpoint
  if (req.params.userId === repo.connectedByUserId) {
    return res.status(400).json({ error: 'cannot_remove_owner', message: 'Owner must disconnect their own access.' });
  }

  const targetAccess = await prisma.repoAccess.findUnique({
    where: { userId_repoId: { userId: req.params.userId, repoId: repo.id } },
  });
  if (!targetAccess) return res.status(404).json({ error: 'member_not_found' });

  await createNotification({
    userId: req.params.userId,
    type: 'repo_removed',
    title: `You were removed from ${repo.fullName}`,
    metadata: { repoId: repo.id, repoName: repo.fullName },
  });

  await prisma.repoAccess.delete({ where: { id: targetAccess.id } });
  res.status(204).send();
});

// ── Stats / Events ────────────────────────────────────────────────────────────

router.get('/repos/:repoId/stats', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const tasks = await prisma.task.findMany({
    where: { repoId: repo.id },
    select: { id: true, status: true, assignee: true },
  });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const commitsThisWeek = await prisma.githubEvent.count({
    where: { repoId: repo.id, eventType: 'COMMIT', createdAt: { gte: oneWeekAgo } },
  });

  res.json({
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    needHelp: tasks.filter((t) => t.status === 'HELP_NEEDED').length,
    inReview: tasks.filter((t) => t.status === 'IN_REVIEW').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    unclaimed: tasks.filter((t) => t.status === 'OPEN' && !t.assignee).length,
    commitsThisWeek,
  });
});

router.get('/repos/:repoId/events', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });
  const events = await prisma.githubEvent.findMany({
    where: { repoId: repo.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(events);
});

export default router;
