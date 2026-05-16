import prisma from '../db/prisma.js';

export const ALL_RULES = ['claim', 'help', 'helping', 'review', 'done'];

export async function ensureRuleConfig(repoId) {
  const existing = await prisma.ruleConfig.findMany({
    where: { repoId },
    select: { ruleType: true },
  });
  const existingTypes = new Set(existing.map((r) => r.ruleType));
  const missing = ALL_RULES.filter((rule) => !existingTypes.has(rule));

  if (missing.length > 0) {
    await prisma.ruleConfig.createMany({
      data: missing.map((ruleType) => ({ repoId, ruleType, enabled: true })),
    });
  }
}

export async function isRuleEnabled(repoId, ruleType) {
  const config = await prisma.ruleConfig.findUnique({
    where: { repoId_ruleType: { repoId, ruleType } },
  });
  return config?.enabled ?? true;
}
