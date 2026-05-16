# Activity attribution

This document describes how TaskMaster attributes commits to tasks.

## The problem

A developer may have multiple active tasks simultaneously. Commits made while
multiple tasks are claimed need to be attributed to the correct one. The naive
approach — count all commits by the assignee in the task's active window —
over-counts every task when windows overlap.

**Example:** Alice claims task-3 on Monday and task-7 on Tuesday. A commit she
makes on Wednesday would be counted by both tasks under the naive strategy,
inflating both counts.

## The strategy: layered attribution

For each commit by the task's assignee within the task's active window
(`claimedAt` → `doneAt` or now), TaskMaster applies three layers in order:

### Layer 1 — Commit message reference

If the commit message contains `#N` or `task-N` (case-insensitive for the
`task-` form), and N matches the current task's `repoTaskNumber`, the commit
is counted for this task.

If N references a *different* task number, the commit is explicitly skipped —
it has been attributed elsewhere.

**Examples that match task #3:**
```
fix: resolve auth race condition (#3)
task-3: refactor session handling
closes #3
```

**Examples that skip for task #3 (attributed elsewhere):**
```
fix auth race (#7)   → counted for task 7 only
task-5 cleanup       → counted for task 5 only
```

### Layer 2 — Branch match

If the task has a `branch` field set, and the commit was made on that branch
(recorded in `github_events.branch`), the commit is counted.

> **Note (Day 11):** The `branch` column exists in `github_events` but was not
> populated for commits prior to Day 11. Layer 2 attribution only applies to
> commits ingested after this field is populated by the poller. Older commits
> fall through to Layer 3. This is documented intentionally — backfilling is
> not feasible without re-fetching all commits from GitHub.

### Layer 3 — No attribution

If neither a message reference nor a branch match is found, the commit is not
counted for this task.

## Tradeoffs

| Aspect | Detail |
|--------|--------|
| Accuracy | Better for tasks with explicit commit message hygiene or branch discipline |
| Conservative | Tasks with no branch set and no `#N` commit references show fewer counts than the naive approach |
| No retroactive impact | Attribution is re-computed on each request; no persisted decision |
| Method transparency | The API includes `activity.method` in responses (`message-ref`, `branch-match`, `no-attribution`) |

## Response shape

Every task endpoint includes an `activity` field:

```json
{
  "activity": {
    "commitCount": 6,
    "lastCommitAt": "2026-05-14T10:30:00.000Z",
    "method": "message-ref"
  }
}
```

`method` values:
- `message-ref` — at least one commit was counted via message reference
- `branch-match` — at least one commit was counted via branch match
- `no-attribution` — the task is claimed but no commits could be attributed
- `no-activity-window` — the task has no `claimedAt` (OPEN or pre-claim)

## Future work

- Persist attribution decisions in a `commit_attributions` table for
  historical analysis and audit trails
- Make the attribution strategy configurable per repo (e.g., "count all" vs
  "layered")
- Surface unattributed commits on the dashboard ("3 of 10 commits in this
  window could not be attributed to any task")
- Populate `github_events.branch` during polling for accurate Layer 2 matching
  on new commits
