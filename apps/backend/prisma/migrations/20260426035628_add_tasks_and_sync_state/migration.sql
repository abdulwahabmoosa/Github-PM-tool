-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "branch" TEXT,
    "linkedIssueNumber" INTEGER,
    "assignee" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "needsHelp" BOOLEAN NOT NULL DEFAULT false,
    "lastManualOverrideAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_state" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "lastCommitShaSeen" TEXT,
    "lastPrUpdatedAtSeen" TIMESTAMP(3),
    "lastPolledAt" TIMESTAMP(3),
    "lastPollStatus" TEXT,
    "lastPollError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_repoId_status_idx" ON "tasks"("repoId", "status");

-- CreateIndex
CREATE INDEX "tasks_assignee_idx" ON "tasks"("assignee");

-- CreateIndex
CREATE UNIQUE INDEX "sync_state_repoId_key" ON "sync_state"("repoId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_state" ADD CONSTRAINT "sync_state_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
