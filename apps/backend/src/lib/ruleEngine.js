import prisma from '../db/prisma.js';
import { recordStatusChange, recordSkip } from './recordStatusChange.js';
import { resolveActorLogin } from './resolveActorLogin.js';

export async function processUnprocessedEvents() {
  const events = await prisma.githubEvent.findMany({
    where: {
      processedAt: null,
      eventType: 'TAG_PUSHED',
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  let transitioned = 0;
  let skipped = 0;

  for (const event of events) {
    const result = await processEvent(event);
    if (result.action === 'transitioned') transitioned++;
    if (result.action === 'skipped' || result.action === 'no_task') skipped++;

    await prisma.githubEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  }

  return { processed: events.length, transitioned, skipped };
}

export async function processEvent(event) {
  const { payload, repoId, externalId } = event;
  const taskNumber = payload?.taskNumber;
  const verb = payload?.verb;

  if (!taskNumber || !verb) {
    return { action: 'invalid_payload', reason: 'missing taskNumber or verb' };
  }

  const task = await prisma.task.findUnique({
    where: { repoId_repoTaskNumber: { repoId, repoTaskNumber: taskNumber } },
  });

  if (!task) {
    console.warn(`[ruleEngine] no task #${taskNumber} in repo ${repoId} for verb ${verb}`);
    return { action: 'no_task', reason: `no task #${taskNumber}` };
  }

  const tagger = {
    name: payload?.actorName ?? null,
    email: payload?.actorEmail ?? null,
  };
  const actorLogin = await resolveActorLogin(tagger);

  const ctx = { task, verb, actorLogin, triggerRef: externalId };

  switch (verb) {
    case 'claim':   return applyClaim(ctx);
    case 'help':    return applyHelp(ctx);
    case 'helping': return applyHelping(ctx);
    case 'review':  return applyReview(ctx);
    case 'done':    return applyDone(ctx);
    default:        return { action: 'invalid_payload', reason: `unknown verb ${verb}` };
  }
}

// ============================================================================
// RULES
// ============================================================================

async function applyClaim({ task, actorLogin, triggerRef }) {
  if (task.status !== 'OPEN') {
    return skipped(task, 'claim', triggerRef, actorLogin,
      `task already ${task.status}, claim only valid from OPEN`);
  }
  if (!actorLogin) {
    return skipped(task, 'claim', triggerRef, actorLogin,
      'cannot claim without actor identity');
  }

  await recordStatusChange({
    taskId: task.id,
    fromStatus: 'OPEN',
    toStatus: 'IN_PROGRESS',
    triggerType: 'TAG',
    triggerVerb: 'claim',
    triggerRef,
    actorLogin,
    automated: true,
    additionalTaskUpdates: {
      assignee: actorLogin,
      claimedAt: new Date(),
      claimBranch: null,
    },
  });
  return { action: 'transitioned' };
}

async function applyHelp({ task, actorLogin, triggerRef }) {
  if (task.status !== 'IN_PROGRESS') {
    return skipped(task, 'help', triggerRef, actorLogin,
      `help only valid from IN_PROGRESS, task is ${task.status}`);
  }
  if (!matchesAssignee(actorLogin, task.assignee)) {
    return skipped(task, 'help', triggerRef, actorLogin,
      'only the assignee can request help');
  }

  await recordStatusChange({
    taskId: task.id,
    fromStatus: 'IN_PROGRESS',
    toStatus: 'HELP_NEEDED',
    triggerType: 'TAG',
    triggerVerb: 'help',
    triggerRef,
    actorLogin,
    automated: true,
  });
  return { action: 'transitioned' };
}

async function applyHelping({ task, actorLogin, triggerRef }) {
  if (task.status !== 'HELP_NEEDED') {
    return skipped(task, 'helping', triggerRef, actorLogin,
      `helping only valid from HELP_NEEDED, task is ${task.status}`);
  }
  if (!actorLogin) {
    return skipped(task, 'helping', triggerRef, actorLogin,
      'cannot help without actor identity');
  }
  if (matchesAssignee(actorLogin, task.assignee)) {
    return skipped(task, 'helping', triggerRef, actorLogin,
      'assignee cannot help their own task');
  }

  await recordStatusChange({
    taskId: task.id,
    fromStatus: 'HELP_NEEDED',
    toStatus: 'IN_PROGRESS',
    triggerType: 'TAG',
    triggerVerb: 'helping',
    triggerRef,
    actorLogin,
    automated: true,
    additionalTaskUpdates: { helper: actorLogin },
  });
  return { action: 'transitioned' };
}

async function applyReview({ task, actorLogin, triggerRef }) {
  if (task.status !== 'IN_PROGRESS') {
    return skipped(task, 'review', triggerRef, actorLogin,
      `review only valid from IN_PROGRESS, task is ${task.status}`);
  }
  if (!matchesAssignee(actorLogin, task.assignee)) {
    return skipped(task, 'review', triggerRef, actorLogin,
      'only the assignee can request review');
  }

  await recordStatusChange({
    taskId: task.id,
    fromStatus: 'IN_PROGRESS',
    toStatus: 'IN_REVIEW',
    triggerType: 'TAG',
    triggerVerb: 'review',
    triggerRef,
    actorLogin,
    automated: true,
  });
  return { action: 'transitioned' };
}

async function applyDone({ task, actorLogin, triggerRef }) {
  if (task.status === 'DONE') {
    return skipped(task, 'done', triggerRef, actorLogin, 'task already DONE');
  }
  if (!matchesAssignee(actorLogin, task.assignee)) {
    return skipped(task, 'done', triggerRef, actorLogin,
      'only the assignee can mark done');
  }

  await recordStatusChange({
    taskId: task.id,
    fromStatus: task.status,
    toStatus: 'DONE',
    triggerType: 'TAG',
    triggerVerb: 'done',
    triggerRef,
    actorLogin,
    automated: true,
  });
  return { action: 'transitioned' };
}

// ============================================================================
// HELPERS
// ============================================================================

function matchesAssignee(actorLogin, assignee) {
  if (!actorLogin || !assignee) return false;
  return actorLogin.toLowerCase() === assignee.toLowerCase();
}

async function skipped(task, verb, triggerRef, actorLogin, reason) {
  await recordSkip({
    taskId: task.id,
    currentStatus: task.status,
    triggerType: 'TAG',
    triggerVerb: verb,
    triggerRef,
    actorLogin,
    reason,
  });
  return { action: 'skipped', reason };
}
