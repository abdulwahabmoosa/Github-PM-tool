import prisma from '../db/prisma.js';
import { resolveActorLogin } from './resolveActorLogin.js';

/**
 * For each task in the input list, compute commit activity using a layered
 * attribution strategy:
 *
 *   Layer 1 — Commit message reference: if the message contains #N or task-N
 *             matching this task's number, count it. If it references a
 *             *different* task number, skip it (attributed elsewhere).
 *   Layer 2 — Branch match: if the task has a branch set and the commit was
 *             on that branch, count it.
 *   Layer 3 — No attribution: don't count.
 *
 * This avoids over-counting when a developer has multiple overlapping tasks.
 * Returns a Map of taskId → { commitCount, lastCommitAt, method }.
 *
 * @param {Array<object>} tasks - Prisma task records
 * @returns {Promise<Map<string, {commitCount:number, lastCommitAt:string|null, method:string}>>}
 */
export async function computeActivityForTasks(tasks) {
  const result = new Map();
  for (const task of tasks) {
    result.set(task.id, { commitCount: 0, lastCommitAt: null, method: 'no-activity-window' });
  }

  const claimedTasks = tasks.filter((t) => t.claimedAt && t.assignee);
  if (claimedTasks.length === 0) return result;

  // Group by repo so we make one events query per repo, not per task
  const tasksByRepo = new Map();
  for (const task of claimedTasks) {
    if (!tasksByRepo.has(task.repoId)) tasksByRepo.set(task.repoId, []);
    tasksByRepo.get(task.repoId).push(task);
  }

  // For DONE tasks, bound the window at the first DONE transition timestamp
  const doneTaskIds = claimedTasks.filter((t) => t.status === 'DONE').map((t) => t.id);
  const doneTransitions = new Map();
  if (doneTaskIds.length > 0) {
    const transitions = await prisma.statusHistory.findMany({
      where: { taskId: { in: doneTaskIds }, toStatus: 'DONE' },
      orderBy: { createdAt: 'asc' },
    });
    for (const t of transitions) {
      if (!doneTransitions.has(t.taskId)) doneTransitions.set(t.taskId, t.createdAt);
    }
  }

  for (const [repoId, repoTasks] of tasksByRepo.entries()) {
    const commitEvents = await prisma.githubEvent.findMany({
      where: { repoId, eventType: 'COMMIT' },
      select: { payload: true, createdAt: true, branch: true },
      orderBy: { createdAt: 'desc' },
    });

    for (const task of repoTasks) {
      const windowStart = task.claimedAt;
      const windowEnd =
        task.status === 'DONE'
          ? (doneTransitions.get(task.id) ?? new Date())
          : new Date();

      let count = 0;
      let lastAt = null;
      let method = null;

      for (const event of commitEvents) {
        const payload = event.payload;
        if (!payload || typeof payload !== 'object') continue;

        // Use authored date when available so late pushes are attributed correctly
        const commitDate = payload.date ? new Date(payload.date) : event.createdAt;
        if (commitDate < windowStart || commitDate > windowEnd) continue;

        // ── Assignee check (unchanged from original) ──────────────────────
        const authorEmail = payload.author?.email ?? null;
        const authorName  = payload.author?.name  ?? null;
        if (!authorEmail && !authorName) continue;

        const resolvedLogin = await resolveActorLogin({ email: authorEmail, name: authorName });
        if (!resolvedLogin) continue;
        if (resolvedLogin.toLowerCase() !== task.assignee.toLowerCase()) continue;

        // ── Layered attribution ───────────────────────────────────────────
        const commitMessage = payload.message ?? '';
        const msgTaskRef = extractTaskNumber(commitMessage);

        if (msgTaskRef !== null) {
          // Layer 1: commit message explicitly names a task number
          if (msgTaskRef === task.repoTaskNumber) {
            count++;
            method = method ?? 'message-ref';
            if (!lastAt || commitDate > lastAt) lastAt = commitDate;
          }
          // else: references a different task — skip (attributed elsewhere)
          continue;
        }

        // Layer 2: branch match (event.branch populated by poller going forward)
        if (event.branch && task.branch) {
          if (normalizeBranch(event.branch) === normalizeBranch(task.branch)) {
            count++;
            method = method ?? 'branch-match';
            if (!lastAt || commitDate > lastAt) lastAt = commitDate;
            continue;
          }
        }

        // Layer 3: no attribution — don't count
      }

      result.set(task.id, {
        commitCount: count,
        lastCommitAt: lastAt ? lastAt.toISOString() : null,
        method: method ?? 'no-attribution',
      });
    }
  }

  return result;
}

/**
 * Parse a task number from a commit message.
 * Recognises: #N at word boundary, and task-N / task#N / task N / task5
 * (case-insensitive, any separator).
 * Returns the integer task number, or null if no reference found.
 */
function extractTaskNumber(message) {
  if (!message) return null;
  const patterns = [
    /(?:^|[\s(])#(\d+)\b/,       // " #5", "(#5", or "#5" at start
    /\btask[-\s_]*#?(\d+)\b/i,   // task-5, task 5, task#5, task5, task_5
  ];
  for (const pattern of patterns) {
    const m = message.match(pattern);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/**
 * Strip refs/heads/ prefix so "refs/heads/feature/x" compares equal to
 * "feature/x".
 */
function normalizeBranch(branch) {
  return branch.replace(/^refs\/heads\//, '').replace(/^\/+/, '');
}
