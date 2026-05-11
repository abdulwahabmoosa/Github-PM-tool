import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { pollRepo } from '../lib/githubPoller.js';
import { getAccessibleRepo } from '../lib/access.js';

const router = Router();

const connectSchema = z.object({
  githubRepoId: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  private: z.boolean(),
  defaultBranch: z.string(),
});

function formatRepo(repo, role) {
  return {
    id: repo.id,
    githubRepoId: String(repo.githubRepoId),
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    private: repo.private,
    defaultBranch: repo.defaultBranch,
    connectedAt: repo.connectedAt,
    role,
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
      data: { userId: req.user.id, repoId: existingRepo.id, role: 'member' },
    });
    return res.status(201).json(formatRepo(existingRepo, 'member'));
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
      data: { userId: req.user.id, repoId: repo.id, role: 'owner' },
    });
    return { repo, access };
  });

  res.status(201).json(formatRepo(repo, access.role));
});

router.delete('/repos/:id', requireAuth, async (req, res) => {
  const accessRow = await prisma.repoAccess.findUnique({
    where: { userId_repoId: { userId: req.user.id, repoId: req.params.id } },
  });
  if (!accessRow) return res.status(404).json({ error: 'not_found' });

  if (accessRow.role === 'member') {
    await prisma.repoAccess.delete({ where: { id: accessRow.id } });
    return res.status(204).send();
  }

  // Owner disconnect: check for other members
  const otherMembers = await prisma.repoAccess.findMany({
    where: { repoId: req.params.id, NOT: { userId: req.user.id } },
    orderBy: { grantedAt: 'asc' },
  });

  if (otherMembers.length === 0) {
    // Solo owner — delete entire repo (cascade handles everything)
    await prisma.repo.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  }

  // Transfer ownership to oldest member
  const newOwner = otherMembers[0];
  await prisma.$transaction([
    prisma.repoAccess.update({ where: { id: newOwner.id }, data: { role: 'owner' } }),
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
