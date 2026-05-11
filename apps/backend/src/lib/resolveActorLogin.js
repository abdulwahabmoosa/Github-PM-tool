import prisma from '../db/prisma.js';

const emailCache = new Map();
const CACHE_MAX = 500;

export async function resolveActorLogin(tagger) {
  if (!tagger) return null;
  const { name, email } = tagger;
  if (!name && !email) return null;

  if (email && emailCache.has(email)) return emailCache.get(email);

  let resolved = null;

  // Strategy 1: email lookup in users table
  if (email) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { githubLogin: true },
    });
    if (user) resolved = user.githubLogin;
  }

  // Strategy 2: name looks like a GitHub login (alphanumeric + dash, no spaces)
  if (!resolved && name && /^[a-z0-9][a-z0-9-]{0,38}$/i.test(name) && !name.includes(' ')) {
    resolved = name.toLowerCase();
  }

  // Strategy 3: prefix-encoded fallback so caller can detect unresolved
  if (!resolved) {
    resolved = email ? `email:${email.toLowerCase()}` : `name:${name}`;
  }

  if (email) {
    if (emailCache.size >= CACHE_MAX) {
      emailCache.delete(emailCache.keys().next().value);
    }
    emailCache.set(email, resolved);
  }

  return resolved;
}

export function isResolvedLogin(login) {
  if (!login) return false;
  return !login.startsWith('email:') && !login.startsWith('name:');
}
