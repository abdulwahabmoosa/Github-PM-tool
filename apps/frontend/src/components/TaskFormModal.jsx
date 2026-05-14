import { useState, useEffect } from 'react';
import { useIssues } from '../hooks/useIssues.js';
import { useCollaborators } from '../hooks/useCollaborators.js';

const INPUT = 'w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500';
const INPUT_ERR = 'w-full bg-white dark:bg-slate-900 border border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-500/30 focus:border-red-500 focus:outline-none rounded-md px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500';
const LABEL = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';
const NOTE  = 'text-xs text-slate-500 dark:text-slate-400 mt-1';

export default function TaskFormModal({ isOpen, onClose, onSubmit, initialValues = {}, repoId, mode }) {
  const { issues, fallbackReason: issuesFallback } = useIssues(repoId);
  const { collaborators, fallbackReason: collabFallback } = useCollaborators(repoId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState('');
  const [needsHelp, setNeedsHelp] = useState(false);
  const [issueSelection, setIssueSelection] = useState('');
  const [manualIssueValue, setManualIssueValue] = useState('');
  const [assigneeSelection, setAssigneeSelection] = useState('');
  const [otherAssigneeValue, setOtherAssigneeValue] = useState('');
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialValues.title ?? '');
    setDescription(initialValues.description ?? '');
    setBranch(initialValues.branch ?? '');
    setNeedsHelp(initialValues.needsHelp ?? false);
    setTitleError('');
    if (initialValues.linkedIssueNumber) {
      setIssueSelection('__manual');
      setManualIssueValue(String(initialValues.linkedIssueNumber));
    } else { setIssueSelection(''); setManualIssueValue(''); }
    if (initialValues.assignee) {
      setAssigneeSelection('__other');
      setOtherAssigneeValue(initialValues.assignee);
    } else { setAssigneeSelection(''); setOtherAssigneeValue(''); }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || !initialValues.linkedIssueNumber) return;
    const found = issues.find((i) => i.number === initialValues.linkedIssueNumber);
    if (found) { setIssueSelection(String(initialValues.linkedIssueNumber)); setManualIssueValue(''); }
  }, [issues]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen || !initialValues.assignee) return;
    const found = collaborators.find((c) => c.login === initialValues.assignee);
    if (found) setAssigneeSelection(initialValues.assignee);
  }, [collaborators]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function buildPayload() {
    let linkedIssueNumber = null;
    if (issuesFallback) { linkedIssueNumber = manualIssueValue ? (parseInt(manualIssueValue, 10) || null) : null; }
    else if (issueSelection === '__manual') { linkedIssueNumber = manualIssueValue ? (parseInt(manualIssueValue, 10) || null) : null; }
    else if (issueSelection !== '') { linkedIssueNumber = parseInt(issueSelection, 10) || null; }

    let assignee = null;
    if (collabFallback) { assignee = otherAssigneeValue.trim() || null; }
    else if (assigneeSelection === '__other') { assignee = otherAssigneeValue.trim() || null; }
    else if (assigneeSelection !== '') { assignee = assigneeSelection; }

    return { title: title.trim(), description: description.trim() || null, branch: branch.trim() || null, linkedIssueNumber, assignee, needsHelp };
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setTitleError('Title is required'); return; }
    setTitleError('');
    onSubmit(buildPayload());
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-50">
            {mode === 'create' ? 'New task' : 'Edit task'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xl leading-none"
          >×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={LABEL}>Title *</label>
            <input
              className={titleError ? INPUT_ERR : INPUT}
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
              placeholder="Task title"
              autoFocus
            />
            {titleError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{titleError}</p>}
          </div>

          <div className="mb-4">
            <label className={LABEL}>Description</label>
            <textarea
              className={`${INPUT} min-h-[80px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="mb-4">
            <label className={LABEL}>Branch</label>
            <input className={INPUT} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="feature/auth" />
          </div>

          <div className="mb-4">
            <label className={LABEL}>Linked issue</label>
            {issuesFallback ? (
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
            {collabFallback ? (
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

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" className="rounded" checked={needsHelp} onChange={(e) => setNeedsHelp(e.target.checked)} />
              Needs help
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 px-3.5 py-2 text-sm font-medium rounded-md transition-colors"
            >
              {mode === 'create' ? 'Create task' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
