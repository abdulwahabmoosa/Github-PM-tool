import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { octokitForUser } from '../lib/octokitFor.js';
import { getAccessibleRepo } from '../lib/access.js';

const router = Router();

const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

router.get('/repos/:repoId/collaborators', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const cacheKey = `collab:${repo.id}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ collaborators: cached, fetched: 'cached' });

  try {
    const octokit = await octokitForUser(req.user.id);
    const { data } = await octokit.rest.repos.listCollaborators({
      owner: repo.owner,
      repo: repo.name,
      per_page: 100,
    });

    const collaborators = data.map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      role: c.permissions?.admin ? 'admin' : c.permissions?.push ? 'write' : 'read',
    }));

    if (!collaborators.some((c) => c.login === req.user.githubLogin)) {
      collaborators.push({ login: req.user.githubLogin, avatarUrl: req.user.avatarUrl, role: 'self' });
    }

    setCached(cacheKey, collaborators);
    res.json({ collaborators, fetched: 'fresh' });
  } catch (err) {
    console.error(`[github-data] collaborators fetch failed for repo ${repo.id}:`, err.message);
    const reason = err.status === 403 ? 'no_permission'
      : err.status === 401 ? 'token_invalid'
      : err.status === 404 ? 'repo_not_found'
      : 'github_error';
    res.json({
      collaborators: [{ login: req.user.githubLogin, avatarUrl: req.user.avatarUrl, role: 'self' }],
      fetched: 'fallback',
      reason,
    });
  }
});

router.get('/repos/:repoId/issues', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const cacheKey = `issues:${repo.id}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ issues: cached, fetched: 'cached' });

  try {
    const octokit = await octokitForUser(req.user.id);
    const { data } = await octokit.rest.issues.listForRepo({
      owner: repo.owner,
      repo: repo.name,
      state: 'open',
      per_page: 100,
    });

    const issues = data
      .filter((i) => !i.pull_request)
      .map((i) => ({ number: i.number, title: i.title, htmlUrl: i.html_url, state: i.state }));

    setCached(cacheKey, issues);
    res.json({ issues, fetched: 'fresh' });
  } catch (err) {
    console.error(`[github-data] issues fetch failed for repo ${repo.id}:`, err.message);
    const reason = err.status === 403 ? 'no_permission'
      : err.status === 401 ? 'token_invalid'
      : err.status === 404 ? 'repo_not_found'
      : 'github_error';
    res.json({ issues: [], fetched: 'fallback', reason });
  }
});

export default router;
