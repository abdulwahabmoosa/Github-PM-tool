import { useMemo } from 'react';

export function useRepoPermissions(repo, myAccess, currentUser) {
  return useMemo(() => {
    const none = {
      canCreateTask: false,
      canEditAnyTask: false,
      canDeleteTask: false,
      canReassign: false,
      canChangeStatus: () => false,
      canConfigureRules: false,
      canSwitchMode: false,
      canManageMembers: false,
      myRole: null,
      isOwner: false,
      repoMode: null,
    };

    if (!repo || !myAccess || !currentUser) return none;

    const isOwner = repo.connectedByUserId === currentUser.id;
    const isAdmin = myAccess.role === 'ADMIN';
    const isOpenMode = repo.mode === 'OPEN';
    const canDoMost = isOpenMode || isAdmin;

    return {
      canCreateTask: canDoMost,
      canEditAnyTask: canDoMost,
      canDeleteTask: canDoMost,
      canReassign: canDoMost,
      canChangeStatus: (task) => {
        if (canDoMost) return true;
        return task?.assignee?.toLowerCase() === currentUser.githubLogin?.toLowerCase();
      },
      canConfigureRules: canDoMost,
      canSwitchMode: isOwner,
      canManageMembers: isOwner,
      myRole: myAccess.role,
      isOwner,
      repoMode: repo.mode,
    };
  }, [repo, myAccess, currentUser]);
}
