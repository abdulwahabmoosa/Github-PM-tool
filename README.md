# TaskMaster

GitHub-integrated project management tool — final-year dissertation project.

## Stack

- **Backend**: Node.js 20+, Express 4, Prisma ORM, PostgreSQL 16
- **Frontend**: Vite + React 18 (JavaScript)
- **Monorepo**: pnpm workspaces
- **Database**: Docker (postgres:16-alpine)

## Quick Start

1. Copy `.env.example` to `.env` and fill in GitHub OAuth credentials
2. `pnpm install`
3. `pnpm db:up`
4. `pnpm db:migrate` (first time only — runs Prisma migrations)
5. `pnpm dev`

Open http://localhost:5173

**Windows note**: Prisma reads `.env` from the package directory. Keep `apps/backend/.env`
in sync with the root `.env` manually, or re-copy after any env changes:
```
cp .env apps/backend/.env
```
