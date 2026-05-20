import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import prisma from '../db/prisma.js';
import { encrypt } from '../lib/crypto.js';

const router = Router();

router.get('/github', (req, res) => {
  const state = randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: 'read:user user:email repo',
    state,
    allow_signup: 'true',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!state || state !== req.session.oauthState) {
    return res.status(400).json({ error: 'Invalid OAuth state' });
  }
  delete req.session.oauthState;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return res.status(400).json({ error: 'GitHub did not return an access token', detail: tokenData });
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'TaskMaster/0.1',
    },
  });

  if (!userRes.ok) {
    return res.status(502).json({ error: 'Failed to fetch GitHub user profile' });
  }

  const ghUser = await userRes.json();

  // GitHub returns email: null for users with private emails. Fetch
  // /user/emails to get the primary email regardless of visibility.
  let resolvedEmail = ghUser.email ?? null;
  if (!resolvedEmail) {
    try {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'TaskMaster/0.1',
        },
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const primary = emails.find((e) => e.primary && e.verified);
        if (primary) resolvedEmail = primary.email;
      }
    } catch (err) {
      console.warn('[auth] failed to fetch /user/emails:', err.message);
    }
  }

  const user = await prisma.user.upsert({
    where: { githubId: BigInt(ghUser.id) },
    update: {
      githubLogin: ghUser.login,
      email: resolvedEmail,
      avatarUrl: ghUser.avatar_url ?? null,
      accessTokenEnc: encrypt(tokenData.access_token),
    },
    create: {
      githubId: BigInt(ghUser.id),
      githubLogin: ghUser.login,
      email: resolvedEmail,
      avatarUrl: ghUser.avatar_url ?? null,
      accessTokenEnc: encrypt(tokenData.access_token),
    },
  });

  req.session.userId = user.id;
  res.redirect(process.env.FRONTEND_URL);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('taskmaster.sid');
    res.status(204).end();
  });
});

export default router;
