import { Router } from 'express';
import prisma from '../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getAccessibleRepo } from '../lib/access.js';

const router = Router();

router.get('/repos/:repoId/insights', requireAuth, async (req, res) => {
  const repo = await getAccessibleRepo(req.params.repoId, req.user.id);
  if (!repo) return res.status(404).json({ error: 'not_found' });

  const repoId = repo.id;
  const now = new Date();
  const fourteenDaysAgo  = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo    = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo     = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  // ── 1. Commits per day, last 14 days ─────────────────────────────────────
  // github_events columns are camelCase (no @map on fields).
  const commitsByDayRaw = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM "github_events"
    WHERE "repoId" = ${repoId}
      AND "eventType" = 'COMMIT'
      AND "createdAt" >= ${fourteenDaysAgo}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const commitsByDay = fillZeroDays(commitsByDayRaw, fourteenDaysAgo, now);

  // ── 2. Tasks completed per week, last 8 weeks ─────────────────────────────
  // No doneAt column — derive from status_history DONE transitions.
  const tasksCompletedByWeekRaw = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE_TRUNC('week', sh."createdAt"), 'YYYY-MM-DD') AS week_start,
      COUNT(*)::int AS count
    FROM "status_history" sh
    JOIN "tasks" t ON sh."taskId" = t.id
    WHERE t."repoId" = ${repoId}
      AND sh."toStatus"   = 'DONE'
      AND sh."fromStatus" IS NOT NULL
      AND sh."fromStatus" != 'DONE'
      AND sh."createdAt"  >= ${eightWeeksAgo}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  const tasksCompletedByWeek = tasksCompletedByWeekRaw.map((r) => ({
    weekStart: r.week_start,
    count: r.count,
  }));

  // ── 3. Top contributors, last 30 days ─────────────────────────────────────
  const topContributorsRaw = await prisma.$queryRaw`
    SELECT
      COALESCE(payload->'author'->>'email', 'unknown') AS author_email,
      COUNT(*)::int AS commits
    FROM "github_events"
    WHERE "repoId" = ${repoId}
      AND "eventType" = 'COMMIT'
      AND "createdAt" >= ${thirtyDaysAgo}
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 5
  `;
  const topContributors = topContributorsRaw.map((r) => ({
    login: r.author_email?.split('@')[0] ?? 'unknown',
    email: r.author_email ?? 'unknown',
    commits: r.commits,
  }));

  // ── 4. Tasks per assignee (current snapshot) ──────────────────────────────
  const tasksPerAssigneeRaw = await prisma.$queryRaw`
    SELECT
      COALESCE("assignee", '(unassigned)') AS login,
      "status",
      COUNT(*)::int AS count
    FROM "tasks"
    WHERE "repoId" = ${repoId}
    GROUP BY 1, 2
    ORDER BY 1, 2
  `;
  const assigneeMap = new Map();
  for (const row of tasksPerAssigneeRaw) {
    if (!assigneeMap.has(row.login)) {
      assigneeMap.set(row.login, { login: row.login, total: 0 });
    }
    const entry = assigneeMap.get(row.login);
    entry[row.status] = row.count;
    entry.total = (entry.total ?? 0) + row.count;
  }
  const tasksPerAssignee = Array.from(assigneeMap.values())
    .sort((a, b) => b.total - a.total);

  // ── 5. Average time from claim to done ────────────────────────────────────
  // Uses task.claimedAt and the DONE transition timestamp in status_history.
  const avgTimeRaw = await prisma.$queryRaw`
    SELECT AVG(EXTRACT(EPOCH FROM (sh."createdAt" - t."claimedAt")))::int AS avg_seconds
    FROM "tasks" t
    JOIN "status_history" sh ON sh."taskId" = t.id
    WHERE t."repoId"     = ${repoId}
      AND t."claimedAt"  IS NOT NULL
      AND sh."toStatus"   = 'DONE'
      AND sh."fromStatus" IS NOT NULL
      AND sh."fromStatus" != 'DONE'
  `;
  const averageTimeInProgress = formatDuration(avgTimeRaw[0]?.avg_seconds ?? null);

  // ── 6. Stuck tasks (active, no update in 7+ days) ─────────────────────────
  const stuckTasks = await prisma.task.findMany({
    where: {
      repoId,
      status: { in: ['IN_PROGRESS', 'HELP_NEEDED', 'IN_REVIEW'] },
      updatedAt: { lte: sevenDaysAgo },
    },
    select: {
      id: true, repoTaskNumber: true, title: true,
      status: true, assignee: true, updatedAt: true,
    },
    orderBy: { updatedAt: 'asc' },
    take: 10,
  });

  // ── 7. Transition stats: tag-driven vs manual, last 30 days ───────────────
  // triggerType values: 'TAG' (rule engine) | 'MANUAL' (tasks.routes.js)
  const transitionsRaw = await prisma.$queryRaw`
    SELECT
      "triggerType",
      COUNT(*)::int AS count
    FROM "status_history" sh
    JOIN "tasks" t ON sh."taskId" = t.id
    WHERE t."repoId"      = ${repoId}
      AND sh."createdAt"  >= ${thirtyDaysAgo}
      AND sh."fromStatus" IS NOT NULL
      AND sh."fromStatus" != sh."toStatus"
      AND sh."triggerType" IN ('TAG', 'MANUAL')
    GROUP BY 1
  `;
  let tagDriven = 0, manual = 0;
  for (const row of transitionsRaw) {
    if (row.triggerType === 'TAG')    tagDriven = row.count;
    if (row.triggerType === 'MANUAL') manual    = row.count;
  }
  const totalLast30Days   = tagDriven + manual;
  const tagDrivenPercent  = totalLast30Days > 0
    ? Math.round((tagDriven / totalLast30Days) * 100)
    : 0;

  res.json({
    commitsByDay,
    tasksCompletedByWeek,
    topContributors,
    tasksPerAssignee,
    averageTimeInProgress,
    stuckTasks,
    transitionStats: { totalLast30Days, tagDriven, manual, tagDrivenPercent },
  });
});

// ── Helpers ────────────────────────────────────────────────────────────────

function fillZeroDays(rows, startDate, endDate) {
  const result = [];
  const lookup = new Map(rows.map((r) => [r.date, r.count]));
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const end   = new Date(endDate);   end.setHours(0, 0, 0, 0);
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().slice(0, 10);
    result.push({ date: ds, count: lookup.get(ds) ?? 0 });
  }
  return result;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return 'no data';
  const days  = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}m`;
}

export default router;
