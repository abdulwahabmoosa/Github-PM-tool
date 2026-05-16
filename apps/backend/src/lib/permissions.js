import prisma from '../db/prisma.js';

/**
 * Check if a user can perform an action on a repo.
 * repo must have: .id, .mode, .connectedByUserId
 * user must have: .id, .githubLogin
 * task (optional) must have: .assignee
 */
export async function canPerform(user, repo, action, task = null) {
  if (!user || !repo) return false;

  const access = await prisma.repoAccess.findFirst({
    where: { repoId: repo.id, userId: user.id },
    select: { role: true },
  });
  if (!access) return false;

  const isOwner = repo.connectedByUserId === user.id;
  const isAdmin = access.role === 'ADMIN';

  // Owner-only actions
  if (action === 'repo.switchMode' || action === 'repo.manageMembers') {
    return isOwner;
  }

  // OPEN mode: everyone can do everything (except owner-only, handled above)
  if (repo.mode === 'OPEN') {
    return true;
  }

  // ADMIN mode — admins can do everything
  if (isAdmin) return true;

  // ADMIN mode — member
  if (action === 'task.changeStatus') {
    if (!task) return false;
    return task.assignee?.toLowerCase() === user.githubLogin?.toLowerCase();
  }

  // All other mutation actions require admin in ADMIN mode
  return false;
}
