import { Octokit } from 'octokit';
import { decrypt } from './crypto.js';
import prisma from '../db/prisma.js';

export async function octokitForUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error(`User not found: ${userId}`);
  const token = decrypt(user.accessTokenEnc);
  return new Octokit({ auth: token });
}

export async function octokitForRepo(repoId) {
  const repo = await prisma.repo.findUnique({ where: { id: repoId } });
  if (!repo) throw new Error(`Repo not found: ${repoId}`);
  return octokitForUser(repo.connectedByUserId);
}
