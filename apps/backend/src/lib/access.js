import prisma from '../db/prisma.js';

export async function getAccessibleRepo(repoId, userId) {
  const access = await prisma.repoAccess.findUnique({
    where: { userId_repoId: { userId, repoId } },
    include: { repo: { include: { syncState: true } } },
  });
  return access ? { ...access.repo, role: access.role } : null;
}

export async function getAccessibleTask(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { repo: true },
  });
  if (!task) return null;
  const hasAccess = await prisma.repoAccess.findUnique({
    where: { userId_repoId: { userId, repoId: task.repoId } },
  });
  return hasAccess ? task : null;
}
