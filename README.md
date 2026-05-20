# TaskMaster

A GitHub-integrated workflow tracker that derives task state from git activity. Push annotated git tags to drive task transitions instead of clicking through external project management tools.

**Live deployment:** https://taskmaster-backend-1039268097215.asia-southeast1.run.app/

## What it does

TaskMaster connects to your GitHub repositories and tracks tasks through a 5-state workflow: `OPEN → IN_PROGRESS → HELP_NEEDED → IN_REVIEW → DONE`. Transitions are driven by annotated git tags that you push from your local machine. The system polls GitHub every 30 seconds to detect new tags and updates task state accordingly. Commit messages with task references (`#5`, `task-5`) are attributed to specific tasks in the dashboard.

The intended use case is small development teams that want to keep workflow status co-located with their git history, eliminating the need to manually update an external board after every code change.

## Tech stack

- **Backend:** Node.js, Express, Prisma 5.22, plain JavaScript ESM
- **Frontend:** React 18, Vite, Tailwind CSS
- **Database:** PostgreSQL 16
- **Auth:** GitHub OAuth
- **Deployment:** Google Cloud Run, Cloud SQL, Secret Manager, Artifact Registry
- **Monorepo:** pnpm workspaces

## Repository structure

```
.
├── apps/
│   ├── backend/          Express API + bundled frontend in production
│   │   ├── src/
│   │   │   ├── lib/      Core domain logic (rule engine, poller, attribution)
│   │   │   ├── services/ Worker processes (polling, rule evaluation)
│   │   │   ├── routes/   HTTP route handlers
│   │   │   └── index.js  Entry point
│   │   ├── prisma/       Schema and migrations
│   │   ├── docs/         Technical design documentation
│   │   └── Dockerfile    Multi-stage production build
│   └── frontend/         React + Vite SPA
│       └── src/
│           ├── pages/    Top-level route components
│           ├── components/
│           └── hooks/
├── pnpm-workspace.yaml
└── README.md
```

## Prerequisites

- Node.js 20 or higher
- pnpm 8 or higher
- PostgreSQL 16 (local installation or Docker)
- A GitHub account
- A GitHub OAuth App (for local development)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/abdulwahabmoosa/Github-PM-tool.git
cd Github-PM-tool
```

### 2. Install dependencies

```bash
pnpm install
```

This installs all dependencies for both the backend and frontend workspaces.

### 3. Set up PostgreSQL

Create a local database:

```bash
psql -U postgres
CREATE DATABASE taskmaster;
\q
```

### 4. Create a GitHub OAuth App

Go to https://github.com/settings/developers and create a new OAuth App:

- **Homepage URL:** `http://localhost:5173`
- **Authorization callback URL:** `http://localhost:4000/auth/github/callback`

Note the Client ID and generate a Client Secret.

### 5. Configure environment variables

Create `apps/backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskmaster"
SESSION_SECRET="any-long-random-string"
TOKEN_ENCRYPTION_KEY="64-hex-characters-for-aes-256"
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
GITHUB_CALLBACK_URL="http://localhost:4000/auth/github/callback"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=4000
```

Generate a `TOKEN_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Run database migrations

```bash
cd apps/backend
pnpm prisma migrate deploy
pnpm prisma generate
cd ../..
```

### 7. Start the development servers

From the project root:

```bash
pnpm dev
```

This starts:
- Backend API on http://localhost:4000
- Frontend dev server on http://localhost:5173

Open http://localhost:5173 in your browser and click "Continue with GitHub" to sign in.

## Using the application

### Connect a repository

1. Sign in with GitHub.
2. Click "Manage repositories" on the dashboard.
3. Pick a repository you own.
4. Choose access mode:
   - **OPEN** — any GitHub collaborator on the repository can participate
   - **ADMIN** — only members you explicitly invite can participate

### Create a task

1. On the dashboard, click "New task".
2. Enter a title, optional description, and an assignee.
3. Note the task number that appears (e.g., task #5). You'll use this in your git tags.

### Push tags to drive workflow

From your terminal in the connected repository, push **annotated** git tags using the `-a` flag:

```bash
# Claim task #5
git tag -a task-5-claim -m "claim" && git push --tags

# Ask for help on task #5
git tag -a task-5-help -m "help" && git push --tags

# A teammate offers to help
git tag -a task-5-helping -m "helping" && git push --tags

# Request review
git tag -a task-5-review -m "review" && git push --tags

# Mark done
git tag -a task-5-done -m "done" && git push --tags
```

Tags must be **annotated** (the `-a` flag). Lightweight tags are rejected because they inherit metadata from the underlying commit rather than the developer who created the tag.

The dashboard updates within one polling cycle (~30 seconds).

### Attribute commits to tasks

Include a task reference in your commit messages and they will be counted toward that task on the dashboard:

```bash
git commit -m "#5 fixed login bug"
git commit -m "task-5 added feature"
git commit -m "task#5 made changes"
git commit -m "(#5) refactored"
```

Commits without a task reference still appear in the repository-wide weekly count but are not attributed to any specific task.

## Common development tasks

### Restart everything cleanly

```bash
# Windows PowerShell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
pnpm dev

# macOS / Linux
pkill -f node
sleep 2
pnpm dev
```

### Inspect the database

```bash
cd apps/backend
pnpm prisma studio
```

Opens a browser interface at http://localhost:5555 to view and edit table data.

### Run migrations after schema changes

```bash
cd apps/backend
pnpm prisma migrate dev --name describe-your-change
```

### Reset local database

```bash
cd apps/backend
pnpm prisma migrate reset
```

This drops the database, recreates it, and reapplies all migrations.

## Production deployment

The live deployment runs on Google Cloud Run. The full deployment process is documented in `apps/backend/docs/activity-attribution.md` and the project's design documentation. The high-level steps are:

1. Build the multi-stage Docker image: `docker build -t taskmaster:local -f apps/backend/Dockerfile .`
2. Tag for Artifact Registry: `docker tag taskmaster:local <registry>/<image>:<version>`
3. Push: `docker push <registry>/<image>:<version>`
4. Deploy in Cloud Run console by selecting the new image revision.

Production environment variables and secrets are managed through Google Secret Manager.

## Workflow state machine

```
OPEN ─── claim ──────► IN_PROGRESS ◄────┐
                          │ help          │ help
                          ▼               │
                       HELP_NEEDED ───────┘
                          │ helping
                          ▼
                       HELPING
                          │ review
                          ▼
                       IN_REVIEW
                          │ done
                          ▼
                        DONE
```

The five verbs are: `claim`, `help`, `helping`, `review`, `done`. Each verb is only valid from specific source states.

## Documentation

Once running, in-app documentation is available at `/docs` (locally: http://localhost:5173/docs). The documentation page covers the workflow in detail, including the rationale for annotated tags, multi-user attribution, and commit attribution patterns.

## Known limitations

- **Polling latency:** state changes appear in the dashboard up to 30 seconds after a tag is pushed
- **Annotated tags required:** lightweight tags are rejected at ingestion
- **Session storage:** uses in-memory sessions; users are logged out when the container restarts (acceptable for current deployment scale)
- **Mobile experience:** the dashboard is functional on mobile but optimised for desktop

