import { useState, useEffect } from 'react';
import { useIssues } from '../hooks/useIssues.js';
import { useCollaborators } from '../hooks/useCollaborators.js';

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const CARD = {
  background: '#fff', borderRadius: 8, padding: 24,
  width: '100%', maxWidth: 540, position: 'relative',
  maxHeight: '90vh', overflowY: 'auto',
};
const fieldStyle = { marginBottom: 16 };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: 4 };
const inputStyle = { width: '100%', padding: '6px 8px', fontSize: '14px', boxSizing: 'border-box', borderRadius: 4, border: '1px solid #ccc' };
const textareaStyle = { ...inputStyle, minHeight: 80, resize: 'vertical' };
const selectStyle = { ...inputStyle };
const noteStyle = { fontSize: '12px', color: '#888', marginTop: 4 };

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

  // Reset form when modal opens
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
    } else {
      setIssueSelection('');
      setManualIssueValue('');
    }
    if (initialValues.assignee) {
      setAssigneeSelection('__other');
      setOtherAssigneeValue(initialValues.assignee);
    } else {
      setAssigneeSelection('');
      setOtherAssigneeValue('');
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upgrade __manual selection to a real dropdown entry once issues load
  useEffect(() => {
    if (!isOpen || !initialValues.linkedIssueNumber) return;
    const found = issues.find((i) => i.number === initialValues.linkedIssueNumber);
    if (found) { setIssueSelection(String(initialValues.linkedIssueNumber)); setManualIssueValue(''); }
  }, [issues]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upgrade __other selection to a real dropdown entry once collaborators load
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
    if (issuesFallback) {
      linkedIssueNumber = manualIssueValue ? (parseInt(manualIssueValue, 10) || null) : null;
    } else if (issueSelection === '__manual') {
      linkedIssueNumber = manualIssueValue ? (parseInt(manualIssueValue, 10) || null) : null;
    } else if (issueSelection !== '') {
      linkedIssueNumber = parseInt(issueSelection, 10) || null;
    }

    let assignee = null;
    if (collabFallback) {
      assignee = otherAssigneeValue.trim() || null;
    } else if (assigneeSelection === '__other') {
      assignee = otherAssigneeValue.trim() || null;
    } else if (assigneeSelection !== '') {
      assignee = assigneeSelection;
    }

    return {
      title: title.trim(),
      description: description.trim() || null,
      branch: branch.trim() || null,
      linkedIssueNumber,
      assignee,
      needsHelp,
    };
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setTitleError('Title is required'); return; }
    setTitleError('');
    onSubmit(buildPayload());
  }

  return (
    <div style={OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={CARD}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}
        >×</button>

        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>
          {mode === 'create' ? 'New task' : 'Edit task'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Title *</label>
            <input
              style={{ ...inputStyle, borderColor: titleError ? 'red' : '#ccc' }}
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
              placeholder="Task title"
              autoFocus
            />
            {titleError && <p style={{ color: 'red', fontSize: '12px', margin: '4px 0 0' }}>{titleError}</p>}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', background: 'none', border: '1px solid #ccc', borderRadius: 4 }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px', borderRadius: 4 }}>
              {mode === 'create' ? 'Create task' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
