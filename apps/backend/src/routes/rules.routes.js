import { Router } from 'express';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getAccessibleRepo } from '../lib/access.js';
import { ensureRuleConfig, ALL_RULES } from '../lib/ruleConfig.js';
import { canPerform } from '../lib/permissions.js';

const router = Router();

router.get('/repos/:repoId/rules', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  await ensureRuleConfig(repo.id);

  const configs = await prisma.ruleConfig.findMany({
    where: { repoId: repo.id },
    orderBy: { ruleType: 'asc' },
  });

  res.json(configs);
});

router.patch('/repos/:repoId/rules/:ruleType', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  if (!await canPerform(req.user, repo, 'rules.configure')) {
    return res.status(403).json({ error: 'permission_denied', action: 'rules.configure' });
  }

  const { ruleType } = req.params;
  if (!ALL_RULES.includes(ruleType)) {
    return res.status(400).json({ error: 'invalid_rule_type' });
  }

  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled_must_be_boolean' });
  }

  await ensureRuleConfig(repo.id);

  const updated = await prisma.ruleConfig.update({
    where: { repoId_ruleType: { repoId: repo.id, ruleType } },
    data: { enabled },
  });

  res.json(updated);
});

export default router;
