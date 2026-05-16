import { useState, useEffect, useCallback } from 'react';
import { cn } from '../lib/cn.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { useIssues } from '../hooks/useIssues.js';
import { useCollaborators } from '../hooks/useCollaborators.js';
import { useHistory } from '../hooks/useHistory.js';
import TaskHistory from './TaskHistory.jsx';

function relativeTime(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_LABELS = {
  OPEN: 'Open', TO_DO: 'To do', IN_PROGRESS: 'In progress',
  HELP_NEEDED: 'Help needed', IN_REVIEW: 'In review', DONE: 'Done',
};
const ALL_STATUSES = ['OPEN', 'TO_DO', 'IN_PROGRESS', 'HELP_NEEDED', 'IN_REVIEW', 'DONE'];

const STATUS_PILL = {
  OPEN:        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  TO_DO:       'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  IN_PROGRESS: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  HELP_NEEDED: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  IN_REVIEW:   'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  DONE:        'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
};

const STATUS_DROPDOWN_BORDER = {
  OPEN:        'border-l-slate-400',
  TO_DO:       'border-l-indigo-500',
  IN_PROGRESS: 'border-l-amber-500',
  HELP_NEEDED: 'border-l-red-500',
  IN_REVIEW:   'border-l-blue-500',
  DONE:        'border-l-emerald-500',
};

const INPUT = 'w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500';
const LABEL = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const NOTE  = 'text-xs text-slate-500 dark:text-slate-400 mt-1';
const PANEL = 'mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800';
const PANEL_LABEL = 'text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2';

const DEFAULT_PERMISSIONS = {
  canEditAnyTask: true, canDeleteTask: true, canReassign: true,
  canChangeStatus: () => true,
};

export default function TaskDetailModal({ task, isOpen, onClose, onSave, onDelete, onStatusChange, repoId, permissions = DEFAULT_PERMISSIONS }) {
  const { issues, fallbackReason: issuesFallback } = useIssues(repoId);
  const { collaborators, fallbackReason: collabFallback } = useCollaborators(repoId);
  const { history, loading: historyLoading, error: historyError, refresh: refreshHistory } = useHistory(task?.id);

  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState('');
  const [needsHelp, setNeedsHelp] = useState(false);
  const [issueSelection, setIssueSelection] = useState('');
  const [manualIssueValue, setManualIssueValue] = useState('');
  const [assigneeSelection, setAssigneeSelection] = useState('');
  const [otherAssigneeValue, setOtherAssigneeValue] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    if (!isOpen || !task) return;
    setTitle(task.title ?? '');
    setDescription(task.description ?? '');
    setBranch(task.branch ?? '');
    setNeedsHelp(task.needsHelp ?? false);
    setEditingTitle(false);
    setShowStatusDropdown(false);
    setTitleError('');
    if (task.linkedIssueNumber) { setIssueSelection('__manual'); setManualIssueValue(String(task.linkedIssueNumber)); }
    else { setIssueSelection(''); setManualIssueValue(''); }
    if (task.assignee) { setAssigneeSelection('__other'); setOtherAssigneeValue(task.assignee); }
    else { setAssigneeSelection(''); setOtherAssigneeValue(''); }
  }, [isOpen, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || !task?.linkedIssueNumber) return;
    const found = issues.find((i) => i.number === task.linkedIssueNumber);
    if (found) { setIssueSelection(String(task.linkedIssueNumber)); setManualIssueValue(''); }
  }, [issues]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || !task?.assignee) return;
    const found = collaborators.find((c) => c.login === task.assignee);
    if (found) setAssigneeSelection(task.assignee);
  }, [collaborators]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleStatusChangeLocal = useCallback(async (taskId, newStatus) => {
    await onStatusChange(taskId, newStatus);
    refreshHistory();
  }, [onStatusChange, refreshHistory]);

  if (!isOpen || !task) return null;

  const canEdit   = permissions.canEditAnyTask;
  const canDelete = permissions.canDeleteTask;
  const canStatus = permissions.canChangeStatus(task);
  const canAssign = permissions.canReassign;

  function computeLinkedIssueNumber() {
    if (issuesFallback) return manualIssueValue ? (parseInt(manualIssueValue, 10) || null) : null;
    if (issueSelection === '__manual') return manualIssueValue ? (parseInt(manualIssueValue, 10) || null) : null;
    if (issueSelection !== '') return parseInt(issueSelection, 10) || null;
    return null;
  }

  function computeAssignee() {
    if (collabFallback) return otherAssigneeValue.trim() || null;
    if (assigneeSelection === '__other') return otherAssigneeValue.trim() || null;
    if (assigneeSelection !== '') return assigneeSelection;
    return null;
  }

  function handleSave() {
    if (!title.trim()) { setTitleError('Title is required'); return; }
    const current = { title: title.trim(), description: description.trim() || null, branch: branch.trim() || null, linkedIssueNumber: computeLinkedIssueNumber(), assignee: computeAssignee(), needsHelp };
    const changed = {};
    for (const [key, val] of Object.entries(current)) {
      if (val !== (task[key] ?? null)) changed[key] = val;
    }
    onSave(task.id, Object.keys(changed).length > 0 ? changed : null);
  }

  function handleDelete() {
    setConfirmState({
      title: `Delete task #${task.repoTaskNumber}?`,
      body: 'This cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
      onConfirm: () => onDelete(task.id),
    });
  }

  const overrideRemainingMs = task.override?.until
    ? Math.max(0, new Date(task.override.until).getTime() - Date.now())
    : 0;
  const overrideActive = overrideRemainingMs > 0;

  return (
    <>
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xl leading-none"
        >×</button>

        {/* Status pill + dropdown */}
        <div className="relative inline-block mb-3">
          {canStatus ? (
            <button
              onClick={() => setShowStatusDropdown((v) => !v)}
              className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer select-none active:scale-[0.97] transition-transform', STATUS_PILL[task.status] ?? STATUS_PILL.OPEN)}
            >
              {STATUS_LABELS[task.status] ?? task.status}
            </button>
          ) : (
            <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-sm font-medium select-none', STATUS_PILL[task.status] ?? STATUS_PILL.OPEN)}>
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
          )}
          {canStatus && showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg z-10 min-w-[140px] py-1">
              {ALL_STATUSES.map((st) => (
                <button
                  key={st}
                  onClick={() => { handleStatusChangeLocal(task.id, st); setShowStatusDropdown(false); }}
                  className={cn('block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-l-2', STATUS_DROPDOWN_BORDER[st] ?? 'border-l-slate-400', 'text-slate-700 dark:text-slate-300')}
                >
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        {canEdit && editingTitle ? (
          <input
            className={`${INPUT} text-xl font-medium mb-4`}
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
            onBlur={() => setEditingTitle(false)}
            autoFocus
          />
        ) : (
          <h2
            onClick={() => canEdit && setEditingTitle(true)}
            title={canEdit ? 'Click to edit' : undefined}
            className={`text-xl font-medium text-slate-900 dark:text-slate-50 mb-4 ${canEdit ? 'cursor-text hover:text-slate-700 dark:hover:text-slate-200' : ''}`}
          >
            {task.repoTaskNumber != null && (
              <span className="text-sm text-slate-400 dark:text-slate-500 font-normal mr-2">
                #{task.repoTaskNumber}
              </span>
            )}
            {title}
          </h2>
        )}
        {titleError && <p className="text-xs text-red-600 dark:text-red-400 -mt-3 mb-3">{titleError}</p>}

        {/* Override banner */}
        {overrideActive && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 mb-4">
            <p className="font-medium text-sm text-red-900 dark:text-red-100">
              🔒 Manual override active
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Automated tag-driven transitions are paused. Automation resumes in{' '}
              {Math.ceil(overrideRemainingMs / 60000)} minutes
              (at {new Date(task.override.until).toLocaleTimeString()}).
            </p>
          </div>
        )}

        {/* Tag commands */}
        <div className={PANEL}>
          <p className={PANEL_LABEL}>Tag commands</p>
          {task.availableCommands?.length > 0 ? (
            task.availableCommands.map((cmd) => (
              <div key={cmd.verb} className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-400 min-w-[140px] flex-shrink-0">{cmd.label}</span>
                <code className="flex-1 font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                  {cmd.command}
                </code>
                <button
                  className="flex-shrink-0 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 text-xs rounded-md transition-colors"
                  onClick={() => navigator.clipboard.writeText(cmd.command)}
                >
                  Copy
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No actions available for this status</p>
          )}
        </div>

        {/* Activity */}
        {task.claimedAt && (
          <div className={PANEL}>
            <p className={PANEL_LABEL}>Activity</p>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-medium text-slate-900 dark:text-slate-50">
                  {task.activity?.commitCount ?? 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(task.activity?.commitCount ?? 0) === 1 ? 'commit' : 'commits'} since claim
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-900 dark:text-slate-50">
                  {task.activity?.lastCommitAt
                    ? relativeTime(task.activity.lastCommitAt)
                    : <span className="text-slate-400 dark:text-slate-500 italic">none</span>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">last commit</p>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className={PANEL}>
          <p className={PANEL_LABEL}>History</p>
          <TaskHistory history={history} loading={historyLoading} error={historyError} />
        </div>

        {/* Form fields */}
        <div className="mb-4">
          <label className={LABEL}>Description</label>
          <textarea className={`${INPUT} min-h-[80px] resize-y`} value={description} onChange={(e) => canEdit && setDescription(e.target.value)} readOnly={!canEdit} placeholder="Optional description" />
        </div>

        <div className="mb-4">
          <label className={LABEL}>Branch</label>
          <input className={INPUT} value={branch} onChange={(e) => canEdit && setBranch(e.target.value)} readOnly={!canEdit} placeholder="feature/auth" />
        </div>

        <div className="mb-4">
          <label className={LABEL}>Linked issue</label>
          {!canEdit ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 py-2">
              {task.linkedIssueNumber ? `#${task.linkedIssueNumber}` : <span className="italic text-slate-400 dark:text-slate-500">None</span>}
            </p>
          ) : issuesFallback ? (
            <>
              <input className={INPUT} type="number" min="1" value={manualIssueValue} onChange={(e) => setManualIssueValue(e.target.value)} placeholder="Issue number" />
              <p className={NOTE}>Couldn't load issues from GitHub ({issuesFallback}). Enter the number manually.</p>
            </>
          ) : (
            <>
              <select className={INPUT} value={issueSelection} onChange={(e) => setIssueSelection(e.target.value)}>
                <option value="">— No linked issue —</option>
                {issues.map((issue) => (
                  <option key={issue.number} value={String(issue.number)}>#{issue.number} — {issue.title}</option>
                ))}
                <option value="__manual">Type a number manually...</option>
              </select>
              {issueSelection === '__manual' && (
                <input className={`${INPUT} mt-1.5`} type="number" min="1" value={manualIssueValue} onChange={(e) => setManualIssueValue(e.target.value)} placeholder="Issue number" />
              )}
            </>
          )}
        </div>

        <div className="mb-4">
          <label className={LABEL}>Assignee</label>
          {!canAssign ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 py-2">
              {task.assignee ?? <span className="italic text-slate-400 dark:text-slate-500">Unassigned</span>}
            </p>
          ) : collabFallback ? (
            <>
              <input className={INPUT} value={otherAssigneeValue} onChange={(e) => setOtherAssigneeValue(e.target.value)} placeholder="GitHub login" />
              <p className={NOTE}>Couldn't load collaborators from GitHub ({collabFallback}). Enter a username manually.</p>
            </>
          ) : (
            <>
              <select className={INPUT} value={assigneeSelection} onChange={(e) => setAssigneeSelection(e.target.value)}>
                <option value="">— Unassigned —</option>
                {collaborators.map((c) => <option key={c.login} value={c.login}>{c.login}</option>)}
                <option value="__other">Type someone else...</option>
              </select>
              {assigneeSelection === '__other' && (
                <input className={`${INPUT} mt-1.5`} value={otherAssigneeValue} onChange={(e) => setOtherAssigneeValue(e.target.value)} placeholder="GitHub login" />
              )}
            </>
          )}
        </div>

        {canEdit && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" className="rounded" checked={needsHelp} onChange={(e) => setNeedsHelp(e.target.checked)} />
              Needs help
            </label>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          {canDelete ? (
            <button
              onClick={handleDelete}
              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 border border-red-300 dark:border-red-800 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            >
              Delete task
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </button>
            {canEdit && (
              <button
                onClick={handleSave}
                className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 px-3.5 py-2 text-sm font-medium rounded-md transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </>
  );
}
