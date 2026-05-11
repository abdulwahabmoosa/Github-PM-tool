import prisma from '../db/prisma.js';
import { pollRepo } from '../lib/githubPoller.js';

const POLL_INTERVAL_MS = 30 * 1000;
let isPolling = false;
let intervalHandle = null;

async function pollAllRepos() {
  if (isPolling) {
    console.log('[poller] previous cycle still running, skipping');
    return;
  }
  isPolling = true;

  try {
    const repos = await prisma.repo.findMany({
      select: { id: true, fullName: true, connectedByUserId: true },
    });

    for (const repo of repos) {
      try {
        const result = await pollRepo(repo.id);
        if (!result.ok) {
          console.warn(`[poller] ${repo.fullName} failed: ${result.status}`);
        }
      } catch (err) {
        console.error(`[poller] ${repo.fullName} unexpected throw:`, err);
      }
    }
  } finally {
    isPolling = false;
  }
}

export function startPoller() {
  if (intervalHandle) return;
  console.log(`[poller] starting, interval ${POLL_INTERVAL_MS}ms`);
  pollAllRepos().catch((err) => console.error('[poller] initial poll error:', err));
  intervalHandle = setInterval(pollAllRepos, POLL_INTERVAL_MS);
}

export function stopPoller() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[poller] stopped');
  }
}
