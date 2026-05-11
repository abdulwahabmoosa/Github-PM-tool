/**
 * @typedef {{ verb: string, command: string, label: string, primary: boolean }} TagCommand
 */

/**
 * Returns the git tag commands available to a viewer for a given task.
 *
 * @param {object} task - Prisma Task record (must include repoTaskNumber, status, assignee, helper)
 * @param {string|null|undefined} viewingUserGithubLogin
 * @returns {TagCommand[]}
 */
export function getAvailableTagCommands(task, viewingUserGithubLogin) {
  const { status, repoTaskNumber, assignee, helper } = task;
  const viewer = viewingUserGithubLogin?.toLowerCase() ?? null;
  const isAssignee = viewer !== null && viewer === (assignee?.toLowerCase() ?? null);
  const isHelper = viewer !== null && viewer === (helper?.toLowerCase() ?? null);

  const cmd = (verb) =>
    `git tag task-${repoTaskNumber}-${verb} && git push --tags`;

  switch (status) {
    case 'OPEN':
      return [{ verb: 'claim', command: cmd('claim'), label: 'Claim this task', primary: true }];

    case 'IN_PROGRESS':
      if (!isAssignee) return [];
      return [
        { verb: 'help',   command: cmd('help'),   label: 'I need help',              primary: false },
        { verb: 'review', command: cmd('review'), label: 'Mark ready for review',    primary: true  },
        { verb: 'done',   command: cmd('done'),   label: 'Mark complete',            primary: false },
      ];

    case 'HELP_NEEDED':
      if (isAssignee) return [];
      if (isHelper) return [];
      return [{ verb: 'helping', command: cmd('helping'), label: 'Help with this task', primary: true }];

    case 'IN_REVIEW':
      if (!isAssignee) return [];
      return [{ verb: 'done', command: cmd('done'), label: 'Mark complete', primary: true }];

    case 'DONE':
    default:
      return [];
  }
}
