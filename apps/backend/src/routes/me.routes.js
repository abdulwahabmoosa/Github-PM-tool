import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { octokitForUser } from '../lib/octokitFor.js';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  const { id, githubLogin, email, avatarUrl } = req.user;
  res.json({ id, githubLogin, email, avatarUrl });
});

router.get('/me/github-repos', requireAuth, async (req, res) => {
  try {
    const octokit = await octokitForUser(req.user.id);

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });

    const repos = data.map((r) => ({
      githubRepoId: r.id,
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      private: r.private,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }));

    res.json(repos);
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ error: 'github_token_invalid' });
    }
    throw err;
  }
});

export default router;
