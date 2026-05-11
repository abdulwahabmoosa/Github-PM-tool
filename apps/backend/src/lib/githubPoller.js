import prisma from '../db/prisma.js';
import { octokitForRepo } from './octokitFor.js';

const TAG_PATTERN = /^task-(\d+)-(claim|help|helping|review|done)$/;
const MAX_COMMITS_PER_POLL = 200;
const FIRST_POLL_LOOKBACK_DAYS = 30;

export async function pollRepo(repoId) {
  let repo = await prisma.repo.findUnique({
    where: { id: repoId },
    include: { syncState: true },
  });
  if (!repo) return { ok: false, status: 'NOT_FOUND', newEvents: 0 };

  if (!repo.syncState) {
    await prisma.syncState.create({ data: { repoId: repo.id } });
    repo = await prisma.repo.findUnique({
      where: { id: repoId },
      include: { syncState: true },
    });
  }
  const syncState = repo.syncState;

  let octokit;
  try {
    octokit = await octokitForRepo(repoId);
  } catch (err) {
    await prisma.syncState.update({
      where: { repoId: repo.id },
      data: { lastPollStatus: 'AUTH_FAILED', lastPollError: err.message },
    }).catch(() => {});
    return { ok: false, status: 'AUTH_FAILED', newEvents: 0 };
  }

  try {
    const { count: newCommits, latestSha } = await pollCommits(octokit, repo, syncState);
    const { count: newTags, unrecognizedCount, anyTagSha } = await pollTags(octokit, repo, syncState);

    const syncUpdate = {
      lastPolledAt: new Date(),
      lastPollStatus: 'OK',
      lastPollError: null,
    };
    if (latestSha) syncUpdate.lastCommitShaSeen = latestSha;
    // Always mark tags as polled so the 50-cap only applies on the true first poll
    syncUpdate.lastTagShaSeen = anyTagSha ?? syncState.lastTagShaSeen ?? new Date().toISOString();

    await prisma.syncState.update({ where: { repoId: repo.id }, data: syncUpdate });

    const newEvents = newCommits + newTags;
    console.log(`[poller] repo ${repo.fullName}: ${newCommits} new commits, ${newTags} new tags, ${unrecognizedCount} unrecognized`);

    return { ok: true, status: 'OK', newEvents };
  } catch (err) {
    console.error(`[poller] ${repo.fullName} error:`, err.message);
    await prisma.syncState.update({
      where: { repoId: repo.id },
      data: { lastPollStatus: 'ERROR', lastPollError: err.message },
    }).catch(() => {});
    return { ok: false, status: 'ERROR', newEvents: 0, error: err.message };
  }
}

async function pollCommits(octokit, repo, syncState) {
  let since;
  if (syncState.lastPolledAt) {
    since = syncState.lastPolledAt.toISOString();
  } else {
    const d = new Date();
    d.setDate(d.getDate() - FIRST_POLL_LOOKBACK_DAYS);
    since = d.toISOString();
  }

  const firstPage = await octokit.rest.repos.listCommits({
    owner: repo.owner,
    repo: repo.name,
    since,
    per_page: 100,
  });

  const remaining = parseInt(firstPage.headers['x-ratelimit-remaining'] ?? '9999', 10);
  if (remaining < 200) {
    console.warn(`[poller] ${repo.fullName}: rate limit low: ${remaining} remaining`);
  }

  let commits = firstPage.data;
  if (commits.length === 100) {
    try {
      const secondPage = await octokit.rest.repos.listCommits({
        owner: repo.owner,
        repo: repo.name,
        since,
        per_page: 100,
        page: 2,
      });
      commits = [...commits, ...secondPage.data];
    } catch (_) { /* use first page only */ }
  }

  if (commits.length === 0) return { count: 0, latestSha: null };

  const rows = commits.slice(0, MAX_COMMITS_PER_POLL).map((commit) => ({
    repoId: repo.id,
    eventType: 'COMMIT',
    externalId: commit.sha,
    branch: null,
    actorLogin: commit.author?.login ?? null,
    payload: {
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author,
      committer: commit.commit.committer,
      date: commit.commit.author?.date,
      html_url: commit.html_url,
    },
  }));

  const result = await prisma.githubEvent.createMany({ data: rows, skipDuplicates: true });
  return { count: result.count, latestSha: commits[0]?.sha ?? null };
}

async function pollTags(octokit, repo, syncState) {
  const { data: tagRefs } = await octokit.rest.git.listMatchingRefs({
    owner: repo.owner,
    repo: repo.name,
    ref: 'tags/',
  });

  if (tagRefs.length === 0) return { count: 0, unrecognizedCount: 0, anyTagSha: null };

  // On first-ever poll, cap to last 50 to avoid flooding on repos with many old tags
  const tagsToProcess = syncState.lastTagShaSeen ? tagRefs : tagRefs.slice(-50);
  const tagNames = tagsToProcess.map((t) => t.ref.replace('refs/tags/', ''));

  const existing = await prisma.githubEvent.findMany({
    where: {
      repoId: repo.id,
      externalId: { in: tagNames },
      eventType: { in: ['TAG_PUSHED', 'UNRECOGNIZED_TAG'] },
    },
    select: { externalId: true },
  });
  const seenNames = new Set(existing.map((e) => e.externalId));

  const newTags = tagsToProcess.filter((t) => !seenNames.has(t.ref.replace('refs/tags/', '')));

  const anyTagSha = tagsToProcess[0]?.object.sha ?? null;
  if (newTags.length === 0) return { count: 0, unrecognizedCount: 0, anyTagSha };

  const rows = [];
  let unrecognizedCount = 0;

  for (const tag of newTags) {
    const tagName = tag.ref.replace('refs/tags/', '');
    const match = TAG_PATTERN.exec(tagName);
    const eventType = match ? 'TAG_PUSHED' : 'UNRECOGNIZED_TAG';
    if (!match) unrecognizedCount++;

    let taggedAt = null;
    let actorEmail = null;
    let actorName = null;
    let fetchError = null;

    try {
      if (tag.object.type === 'tag') {
        const { data: annotated } = await octokit.rest.git.getTag({
          owner: repo.owner,
          repo: repo.name,
          tag_sha: tag.object.sha,
        });
        taggedAt = annotated.tagger?.date ?? null;
        actorEmail = annotated.tagger?.email ?? null;
        actorName = annotated.tagger?.name ?? null;
      } else {
        const { data: commit } = await octokit.rest.git.getCommit({
          owner: repo.owner,
          repo: repo.name,
          commit_sha: tag.object.sha,
        });
        taggedAt = commit.author?.date ?? null;
        actorEmail = commit.author?.email ?? null;
        actorName = commit.author?.name ?? null;
      }
    } catch (err) {
      fetchError = err.message;
    }

    rows.push({
      repoId: repo.id,
      eventType,
      externalId: tagName,
      branch: null,
      actorLogin: null,
      payload: {
        tagName,
        ...(match && {
          taskNumber: parseInt(match[1], 10),
          verb: match[2],
        }),
        targetSha: tag.object.sha,
        tagSha: tag.node_id,
        taggedAt,
        actorEmail,
        actorName,
        rawRef: tag.ref,
        ...(fetchError && { fetchError }),
      },
    });
  }

  const result = await prisma.githubEvent.createMany({ data: rows, skipDuplicates: true });
  return { count: result.count, unrecognizedCount, anyTagSha };
}
