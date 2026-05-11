import { useState, useEffect } from 'react';
import { useIssues } from '../hooks/useIssues.js';
import { useCollaborators } from '../hooks/useCollaborators.js';

const STATUS_COLORS = {
  OPEN:        '#888780',
  TO_DO:       '#534AB7',
  IN_PROGRESS: '#BA7517',
  HELP_NEEDED: '#C0392B',
  IN_REVIEW:   '#185FA5',
  DONE:        '#639922',
};
const STATUS_LABELS = {
  OPEN: 'Open', TO_DO: 'To do', IN_PROGRESS: 'In progress',
  HELP_NEEDED: 'Help needed', IN_REVIEW: 'In review', DONE: 'Done',
};
const ALL_STATUSES = ['OPEN', 'TO_DO', 'IN_PROGRESS', 'HELP_NEEDED', 'IN_REVIEW', 'DONE'];

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const CARD = {
  background: '#fff', borderRadius: 8, padding: 24,
  width: '100%', maxWidth: 540, position: 'relative',
  maxHeight: '90vh', overflowY: 'auto',
};
const inputStyle = { width: '100%', padding: '6px 8px', fontSize: '14px', boxSizing: 'border-box', borderRadius: 4, border: '1px solid #ccc' };
const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical' };
const selectStyle = { ...inputStyle };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: 4 };
const fieldStyle = { marginBottom: 14 };
const noteStyle = { fontSize: '12px', color: '#888', marginTop: 4 };

export default function TaskDetailModal({ task, isOpen, onClose, onSave, onDelete, onStatusChange, repoId }) {
  const { issues, fallbackReason: issuesFallback } = useIssues(repoId);
  const { collaborators, fallbackReason: collabFallback } = useCollaborators(repoId);

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

  // Reset local state whenever the modal opens for a (potentially different) task
  useEffect(() => {
    if (!isOpen || !task) return;
    setTitle(task.title ?? '');
    setDescription(task.description ?? '');
    setBranch(task.branch ?? '');
    setNeedsHelp(task.needsHelp ?? false);
    setEditingTitle(false);
    setShowStatusDropdown(false);
    setTitleError('');
    if (task.linkedIssueNumber) {
      setIssueSelection('__manual');
      setManualIssueValue(String(task.linkedIssueNumber));
    } else {
      setIssueSelection('');
      setManualIssueValue('');
    }
    if (task.assignee) {
      setAssigneeSelection('__other');
      setOtherAssigneeValue(task.assignee);
    } else {
      setAssigneeSelection('');
      setOtherAssigneeValue('');
    }
  }, [isOpen, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upgrade to real dropdown entry once issues load
  useEffect(() => {
    if (!isOpen || !task?.linkedIssueNumber) return;
    const found = issues.find((i) => i.number === task.linkedIssueNumber);
    if (found) { setIssueSelection(String(task.linkedIssueNumber)); setManualIssueValue(''); }
  }, [issues]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upgrade to real dropdown entry once collaborators load
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

  if (!isOpen || !task) return null;

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
    const current = {
      title: title.trim(),
      description: description.trim() || null,
      branch: branch.trim() || null,
      linkedIssueNumber: computeLinkedIssueNumber(),
      assignee: computeAssignee(),
      needsHelp,
    };
    const changed = {};
    for (const [key, val] of Object.entries(current)) {
      if (val !== (task[key] ?? null)) changed[key] = val;
    }
    onSave(task.id, Object.keys(changed).length > 0 ? changed : null);
  }

  function handleDelete() {
    if (window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) {
      onDelete(task.id);
    }
  }

  const statusColor = STATUS_COLORS[task.status] ?? '#888780';

  return (
    <div style={OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={CARD}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}
        >×</button>

        {/* Status pill + dropdown */}
        <div style={{ marginBottom: 12, position: 'relative', display: 'inline-block' }}>
          <span
            onClick={() => setShowStatusDropdown((v) => !v)}
            style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: statusColor, color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
          >
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
          {showStatusDropdown && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 10, minWidth: 140 }}>
              {ALL_STATUSES.map((st) => (
                <button
                  key={st}
                  onClick={() => { onStatusChange(task.id, st); setShowStatusDropdown(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontFamily: 'system-ui', borderLeft: `3px solid ${STATUS_COLORS[st]}` }}
                >
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title — inline edit */}
        {editingTitle ? (
          <input
            style={{ ...inputStyle, fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
            onBlur={() => setEditingTitle(false)}
            autoFocus
          />
        ) : (
          <h2
            onClick={() => setEditingTitle(true)}
            title="Click to edit"
            style={{ fontSize: '1.2rem', fontWeight: 600, margin: '8px 0 16px', cursor: 'text', borderBottom: '1px solid transparent' }}
          >
            {task.repoTaskNumber != null && (
              <span style={{ fontSize: '1rem', color: '#999', fontWeight: 400, marginRight: 8 }}>
                #{task.repoTaskNumber}
              </span>
            )}
            {title}
          </h2>
        )}
        {titleError && <p style={{ color: 'red', fontSize: '12px', marginTop: -12, marginBottom: 12 }}>{titleError}</p>}

        {/* Tag commands */}
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, background: '#fafafa', padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tag commands</p>
          {task.availableCommands?.length > 0 ? (
            task.availableCommands.map((cmd) => (
              <div key={cmd.verb} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '12px', color: '#666', minWidth: 140, flexShrink: 0 }}>{cmd.label}</span>
                <code style={{
                  fontSize: 11, padding: '3px 8px', background: '#f0f0f0',
                  borderRadius: 4, fontFamily: 'ui-monospace, monospace',
                  flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cmd.command}
                </code>
                <button
                  style={{ fontSize: 11, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => { navigator.clipboard.writeText(cmd.command); }}
                >
                  Copy
                </button>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: '#999', margin: 0, fontStyle: 'italic' }}>
              No actions available for this status
            </p>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea style={textareaStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Branch</label>
          <input style={inputStyle} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="feature/auth" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Linked issue</label>
          {issuesFallback ? (
            <>
              <input style={inputStyle} type="number" min="1" value={manualIssueValue} onChange={(e) => setManualIssueValue(e.target.value)} placeholder="Issue number" />
              <p style={noteStyle}>Couldn't load issues from GitHub ({issuesFallback}). Enter the number manually.</p>
            </>
          ) : (
            <>
              <select style={selectStyle} value={issueSelection} onChange={(e) => setIssueSelection(e.target.value)}>
                <option value="">— No linked issue —</option>
                {issues.map((issue) => (
                  <option key={issue.number} value={String(issue.number)}>
                    #{issue.number} — {issue.title}
                  </option>
                ))}
                <option value="__manual">Type a number manually...</option>
              </select>
              {issueSelection === '__manual' && (
                <input style={{ ...inputStyle, marginTop: 6 }} type="number" min="1" value={manualIssueValue} onChange={(e) => setManualIssueValue(e.target.value)} placeholder="Issue number" />
              )}
            </>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Assignee</label>
          {collabFallback ? (
            <>
              <input style={inputStyle} value={otherAssigneeValue} onChange={(e) => setOtherAssigneeValue(e.target.value)} placeholder="GitHub login" />
              <p style={noteStyle}>Couldn't load collaborators from GitHub ({collabFallback}). Enter a username manually.</p>
            </>
          ) : (
            <>
              <select style={selectStyle} value={assigneeSelection} onChange={(e) => setAssigneeSelection(e.target.value)}>
                <option value="">— Unassigned —</option>
                {collaborators.map((c) => (
                  <option key={c.login} value={c.login}>{c.login}</option>
                ))}
                <option value="__other">Type someone else...</option>
              </select>
              {assigneeSelection === '__other' && (
                <input style={{ ...inputStyle, marginTop: 6 }} value={otherAssigneeValue} onChange={(e) => setOtherAssigneeValue(e.target.value)} placeholder="GitHub login" />
              )}
            </>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px' }}>
            <input type="checkbox" checked={needsHelp} onChange={(e) => setNeedsHelp(e.target.checked)} />
            Needs help
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 }}>
          <button
            onClick={handleDelete}
            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#c0392b', background: 'none', border: '1px solid #c0392b', borderRadius: 4 }}
          >
            Delete task
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', background: 'none', border: '1px solid #ccc', borderRadius: 4 }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', borderRadius: 4 }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
