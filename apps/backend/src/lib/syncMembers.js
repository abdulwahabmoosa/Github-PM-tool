import prisma from '../db/prisma.js';
import { octokitForRepo } from './octokitFor.js';
import { createNotification } from './notifications.js';

// 5-minute in-memory cache to avoid hammering the GitHub API every 30s poll
const collaboratorCache = new Map(); // repoId -> { logins: Set<string>, fetchedAt: number }
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Sync TaskMaster's repo_access rows with GitHub's actual collaborator list.
 * Removes users who are no longer GitHub collaborators (except the owner —
 * they get the ownerNotInGitHub flag instead so the UI can show a warning).
 *
 * Returns: { collaboratorLogins, removedUserIds, ownerNotInGitHub } or null if
 * repo not found.
 */
export async function syncRepoMembers(repoId, options = {}) {
  const { forceFresh = false } = options;

  const repo = await prisma.repo.findUnique({
    where: { id: repoId },
    include: { connectedBy: { select: { githubLogin: true } } },
  });
  if (!repo) return null;

  // Check cache
  const cached = collaboratorCache.get(repoId);
  let collaboratorLogins;

  if (!forceFresh && cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    collaboratorLogins = cached.logins;
  } else {
    try {
      const octokit = await octokitForRepo(repoId);
      const { data } = await octokit.rest.repos.listCollaborators({
        owner: repo.owner,
        repo: repo.name,
        per_page: 100,
      });
      collaboratorLogins = new Set(data.map((c) => c.login.toLowerCase()));
      collaboratorCache.set(repoId, { logins: collaboratorLogins, fetchedAt: Date.now() });
    } catch (err) {
      console.error(`[sync] failed to fetch collaborators for repo ${repoId}:`, err.message);
      // Fail safe: don't remove anyone when we can't verify
      return {
        collaboratorLogins: cached?.logins ?? new Set(),
        removedUserIds: [],
        ownerNotInGitHub: false,
        error: err.message,
      };
    }
  }

  const ownerLogin = repo.connectedBy.githubLogin.toLowerCase();
  const ownerNotInGitHub = !collaboratorLogins.has(ownerLogin);

  const accesses = await prisma.repoAccess.findMany({
    where: { repoId },
    include: { user: { select: { id: true, githubLogin: true } } },
  });

  const removedUserIds = [];
  for (const a of accesses) {
    const login = a.user.githubLogin.toLowerCase();
    const isOwner = a.userId === repo.connectedByUserId;
    if (!collaboratorLogins.has(login) && !isOwner) {
      // 1. Notify the removed user
      await createNotification({
        userId: a.userId,
        type: 'repo_access_revoked',
        title: `Access to ${repo.fullName} was revoked`,
        body: 'You are no longer a collaborator on this GitHub repository.',
        metadata: { repoId, repoName: repo.fullName },
      });

      // 2. Reset their non-DONE tasks to unclaimed
      const affectedTasks = await prisma.task.findMany({
        where: {
          repoId,
          OR: [
            { assignee: { equals: a.user.githubLogin, mode: 'insensitive' } },
            { helper:   { equals: a.user.githubLogin, mode: 'insensitive' } },
          ],
          status: { not: 'DONE' },
        },
        select: { id: true, status: true, assignee: true, helper: true },
      });

      for (const t of affectedTasks) {
        try {
          const isAssignee = t.assignee?.toLowerCase() === login;
          // Helper-only case: clear helper but preserve status and assignee
          const taskData = isAssignee
            ? { status: 'OPEN', assignee: null, helper: null }
            : { helper: null };
          const toStatus = isAssignee ? 'OPEN' : t.status;

          await prisma.task.update({ where: { id: t.id }, data: taskData });
          await prisma.statusHistory.create({
            data: {
              taskId: t.id,
              fromStatus: t.status,
              toStatus,
              triggerType: 'SYSTEM',
              actorLogin: null,
              automated: true,
              note: `Unassigned: ${a.user.githubLogin} is no longer a repo collaborator`,
            },
          });
        } catch (err) {
          console.error(`[sync] failed to reset task ${t.id} for removed user ${a.user.githubLogin}:`, err.message);
        }
      }

      if (affectedTasks.length > 0) {
        console.log(`[sync] repo ${repo.fullName}: reset ${affectedTasks.length} task(s) from ${a.user.githubLogin}`);
      }

      // 3. Remove access
      await prisma.repoAccess.delete({ where: { id: a.id } });
      removedUserIds.push(a.userId);
    }
  }

  if (removedUserIds.length > 0) {
    console.log(`[sync] repo ${repo.fullName}: removed ${removedUserIds.length} stale access row(s)`);
  }

  return { collaboratorLogins, removedUserIds, ownerNotInGitHub };
}

/**
 * Fast check: is githubLogin a current member of repoId?
 * Uses cache when warm, falls back to repo_access table (cheaper than a
 * GitHub API call per tag event).
 */
export async function isCurrentMember(repoId, githubLogin) {
  if (!githubLogin) return false;

  const cached = collaboratorCache.get(repoId);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.logins.has(githubLogin.toLowerCase());
  }

  // No warm cache — use TaskMaster's own access table as a reasonable proxy.
  // The sync runs on every poll cycle so it stays current within ~30s.
  const access = await prisma.repoAccess.findFirst({
    where: {
      repoId,
      user: { githubLogin: { equals: githubLogin, mode: 'insensitive' } },
    },
  });
  return !!access;
}
