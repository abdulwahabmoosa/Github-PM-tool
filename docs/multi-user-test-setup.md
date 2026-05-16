# Multi-user testing setup

To test multi-user tag-driven workflows end-to-end, set up a second local
clone of the test repository using your second GitHub account's git identity.

## Prerequisites

- Second GitHub account exists (e.g., `logicg861-blip`) and has been:
  - Invited as a collaborator on `abdulwahabmoosa/test`
  - Accepted the invitation
  - Logged into TaskMaster via an incognito browser window
  - Connected to the test repo (showing as `member`)

## Setup

1. Generate a Personal Access Token for the second account:
   - Log into the second account on GitHub
   - Go to Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Save the token securely

2. Create a separate local clone with secondary credentials:

```powershell
cd D:\Downloads
mkdir test-as-secondary
cd test-as-secondary
git clone https://github.com/abdulwahabmoosa/test.git .

# Set LOCAL git config (only applies to this clone, doesn't affect global)
git config user.email "<secondary-account-github-email>"
git config user.name "logicg861-blip"

# Set HTTPS auth to use the secondary account's PAT
# Replace <PAT> with the token, <secondary-email> with the email
git remote set-url origin https://logicg861-blip:<PAT>@github.com/abdulwahabmoosa/test.git
```

3. Verify the setup:

```powershell
git config user.email
git config user.name
# Both should return secondary account values
```

## Multi-user test scenarios

### Scenario A: Second user claims a task

1. From the original clone (your main account), make sure there's an OPEN
   task in the test repo. Note its number (let's say #5).
2. Switch to the secondary clone:

```powershell
cd D:\Downloads\test-as-secondary
git commit --allow-empty -m "secondary user claim test"
git push
git tag task-5-claim
git push --tags
```

3. Poll in TaskMaster (either click "Poll now" or wait 30s).
4. The rule engine ticks within 15s.
5. Task #5 should transition to IN_PROGRESS with assignee `logicg861-blip`
   (or however resolveActorLogin resolves the secondary email).
6. View the task's history — should show the claim transition attributed
   to the second user.

### Scenario B: Helping flow

1. Main account claims task #5 from the main clone:
   `git tag task-5-claim && git push --tags`
2. Main account requests help:
   `git tag task-5-help && git push --tags`
3. Switch to secondary clone, second account offers help:
   `git tag task-5-helping && git push --tags`
4. After polling + rule engine: task back to IN_PROGRESS, helper field set
   to `logicg861-blip`.

### Scenario C: Cross-account review/done attempts (guard tests)

1. Task assigned to your main account.
2. From secondary clone, push `task-5-done`:
   `git tag task-5-done && git push --tags`
3. After polling + rule engine: SHOULD NOT transition. Skip row in history:
   "skipped: only the assignee can mark done"

## Cleanup

After testing, optionally delete the test tags:

```powershell
git push --delete origin task-5-claim task-5-help task-5-helping task-5-done
git tag -d task-5-claim task-5-help task-5-helping task-5-done
```
