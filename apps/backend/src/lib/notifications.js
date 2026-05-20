import prisma from '../db/prisma.js';

export async function createNotification({
  userId,
  type,
  title,
  body = null,
  linkTo = null,
  metadata = {},
}) {
  if (!userId || !type || !title) {
    console.warn('[notifications] missing required fields', { userId, type, title });
    return null;
  }
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, linkTo, metadata },
    });
  } catch (err) {
    console.error('[notifications] failed to create:', err.message);
    return null;
  }
}

export async function notifyUserByLogin(login, actorUserId, payload) {
  if (!login) return null;
  const user = await prisma.user.findFirst({
    where: { githubLogin: login },
    select: { id: true },
  });
  if (!user) return null;
  if (user.id === actorUserId) return null;
  return createNotification({ ...payload, userId: user.id });
}

export async function notifyRepoMembers(repoId, role, actorUserId, payload) {
  const accesses = await prisma.repoAccess.findMany({
    where: { repoId, ...(role ? { role } : {}) },
    select: { userId: true },
  });
  const results = [];
  for (const a of accesses) {
    if (a.userId === actorUserId) continue;
    results.push(await createNotification({ ...payload, userId: a.userId }));
  }
  return results.filter(Boolean);
}

// Unlike notifyUserByLogin, this notifies the tagger themselves (they ARE the
// intended recipient for tag_rejected / tag_skipped_override events).
export async function notifyTagger(login, payload) {
  if (!login) return null;
  const user = await prisma.user.findFirst({
    where: { githubLogin: login },
    select: { id: true },
  });
  if (!user) return null;
  return createNotification({ ...payload, userId: user.id });
}
