import { Router } from 'express';
import { Octokit } from 'octokit';
import { requireAuth } from '../middleware/requireAuth.js';
import { decrypt } from '../lib/crypto.js';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  const { id, githubLogin, email, avatarUrl } = req.user;
  res.json({ id, githubLogin, email, avatarUrl });
});

router.get('/me/github-repos', requireAuth, async (req, res) => {
  try {
    const token = decrypt(req.user.accessTokenEnc);
    const octokit = new Octokit({ auth: token });

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
