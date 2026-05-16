import prisma from '../db/prisma.js';
import { recordStatusChange, recordSkip } from './recordStatusChange.js';
import { resolveActorLogin } from './resolveActorLogin.js';
import { hasRecentOverride, overrideRemainingMs } from './overrideWindow.js';
import { isRuleEnabled } from './ruleConfig.js';
import { notifyUserByLogin, notifyRepoMembers, notifyTagger } from './notifications.js';
import { isCurrentMember } from './syncMembers.js';

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
  const actorUser = actorLogin
    ? await prisma.user.findFirst({ where: { githubLogin: actorLogin }, select: { id: true } })
    : null;
  const actorUserId = actorUser?.id ?? null;

  // Membership guard: silently skip tags from users no longer in this repo
  if (actorLogin) {
    const isMember = await isCurrentMember(repoId, actorLogin);
    if (!isMember) {
      return await skipped(task, verb, externalId, actorLogin,
        `actor ${actorLogin} is not a current repo member`, null);
    }
  }

  // Manual override guard: block automated transitions for 5 minutes after
  // the user manually sets a status, so their intent isn't immediately clobbered.
  if (hasRecentOverride(task)) {
    const remainingMin = Math.ceil(overrideRemainingMs(task) / 60000);
    return await skipped(task, verb, externalId, actorLogin,
      `manual override in effect (resumes in ${remainingMin}m)`, 'tag_skipped_override');
  }

  // Rule config guard: check if this verb's rule is enabled for the repo.
  const ruleEnabled = await isRuleEnabled(repoId, verb);
  if (!ruleEnabled) {
    return await skipped(task, verb, externalId, actorLogin,
      `${verb} rule disabled for this repo`, null);
  }

  const ctx = { task, verb, actorLogin, actorUserId, triggerRef: externalId };

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

async function applyClaim({ task, actorLogin, actorUserId, triggerRef }) {
  if (task.status !== 'OPEN') {
    return skipped(task, 'claim', triggerRef, actorLogin,
      `task already ${task.status}, claim only valid from OPEN`);
  }
  if (!actorLogin) {
    return skipped(task, 'claim', triggerRef, actorLogin,
      'cannot claim without actor identity');
  }
  if (task.assignee && task.assignee.toLowerCase() !== actorLogin.toLowerCase()) {
    await notifyUserByLogin(task.assignee, actorUserId, {
      type: 'task_claim_attempted',
      title: `${actorLogin} tried to claim your task #${task.repoTaskNumber}`,
      body: `Task: ${task.title}`,
      linkTo: '/dashboard',
      metadata: {
        taskId: task.id,
        taskNumber: task.repoTaskNumber,
        attemptedBy: actorLogin,
        repoId: task.repoId,
      },
    });
    return skipped(task, 'claim', triggerRef, actorLogin,
      `claim rejected: task already assigned to ${task.assignee}`);
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

async function applyHelp({ task, actorLogin, actorUserId, triggerRef }) {
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
  await notifyRepoMembers(task.repoId, 'ADMIN', actorUserId, {
    type: 'task_help_requested',
    title: `Task #${task.repoTaskNumber} needs help: ${task.title}`,
    body: `${actorLogin} requested help`,
    linkTo: '/dashboard',
    metadata: { taskId: task.id, repoId: task.repoId },
  });
  return { action: 'transitioned' };
}

async function applyHelping({ task, actorLogin, actorUserId, triggerRef }) {
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

  const originalAssignee = task.assignee;
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
  if (originalAssignee) {
    await notifyUserByLogin(originalAssignee, actorUserId, {
      type: 'task_helping_offered',
      title: `${actorLogin} offered help on task #${task.repoTaskNumber}`,
      body: task.title,
      linkTo: '/dashboard',
      metadata: { taskId: task.id, helperLogin: actorLogin },
    });
  }
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

async function skipped(task, verb, triggerRef, actorLogin, reason, notificationType = 'tag_rejected') {
  await recordSkip({
    taskId: task.id,
    currentStatus: task.status,
    triggerType: 'TAG',
    triggerVerb: verb,
    triggerRef,
    actorLogin,
    reason,
  });
  if (notificationType && actorLogin) {
    const title = notificationType === 'tag_skipped_override'
      ? `Tag ${triggerRef} skipped: manual override active`
      : `Tag rejected: ${triggerRef}`;
    await notifyTagger(actorLogin, {
      type: notificationType,
      title,
      body: reason,
      linkTo: '/dashboard',
      metadata: { taskId: task.id, tagName: triggerRef, reason },
    });
  }
  return { action: 'skipped', reason };
}
