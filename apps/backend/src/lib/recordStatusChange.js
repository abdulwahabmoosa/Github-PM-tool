import prisma from '../db/prisma.js';

export async function recordStatusChange({
  taskId,
  fromStatus,
  toStatus,
  triggerType,
  triggerVerb = null,
  triggerRef = null,
  actorLogin = null,
  automated,
  additionalTaskUpdates = {},
  note = null,
}) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id: taskId },
      data: { status: toStatus, ...additionalTaskUpdates },
    });
    const history = await tx.statusHistory.create({
      data: {
        taskId, fromStatus, toStatus, triggerType, triggerVerb,
        triggerRef, actorLogin, automated, note,
      },
    });
    return { task, history };
  });
}

export async function recordSkip({
  taskId, currentStatus, triggerType, triggerVerb,
  triggerRef, actorLogin, reason,
}) {
  return prisma.statusHistory.create({
    data: {
      taskId,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      triggerType,
      triggerVerb,
      triggerRef,
      actorLogin,
      automated: true,
      note: `skipped: ${reason}`,
    },
  });
}
