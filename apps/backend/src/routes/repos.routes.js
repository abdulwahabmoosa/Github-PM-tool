import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const connectSchema = z.object({
  githubRepoId: z.union([z.number(), z.string()]).transform((v) => BigInt(v)),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  private: z.boolean(),
  defaultBranch: z.string(),
});

function formatRepo(repo) {
  return {
    id: repo.id,
    githubRepoId: String(repo.githubRepoId),
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    private: repo.private,
    defaultBranch: repo.defaultBranch,
    connectedAt: repo.connectedAt,
  };
}

router.get('/repos', requireAuth, async (req, res) => {
  const repos = await prisma.repo.findMany({
    where: { userId: req.user.id },
    orderBy: { connectedAt: 'desc' },
  });
  res.json(repos.map(formatRepo));
});

router.post('/repos/connect', requireAuth, async (req, res) => {
  const result = connectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid_body', issues: result.error.issues });
  }
  const { githubRepoId, owner, name, fullName, private: isPrivate, defaultBranch } = result.data;

  const existing = await prisma.repo.findUnique({ where: { githubRepoId } });
  if (existing) {
    if (existing.userId === req.user.id) {
      await prisma.syncState.upsert({
        where: { repoId: existing.id },
        update: {},
        create: { repoId: existing.id },
      });
      return res.status(200).json(formatRepo(existing));
    }
    return res.status(409).json({ error: 'repo_already_connected' });
  }

  const repo = await prisma.repo.create({
    data: { userId: req.user.id, githubRepoId, owner, name, fullName, private: isPrivate, defaultBranch },
  });

  await prisma.syncState.upsert({
    where: { repoId: repo.id },
    update: {},
    create: { repoId: repo.id },
  });

  res.status(201).json(formatRepo(repo));
});

router.delete('/repos/:id', requireAuth, async (req, res) => {
  const repo = await prisma.repo.findUnique({ where: { id: req.params.id } });
  if (!repo || repo.userId !== req.user.id) {
    return res.status(404).json({ error: 'not_found' });
  }
  await prisma.repo.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
