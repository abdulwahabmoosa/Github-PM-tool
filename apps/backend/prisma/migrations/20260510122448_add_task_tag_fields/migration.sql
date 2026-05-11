/*
  Warnings:

  - You are about to drop the column `lastPrUpdatedAtSeen` on the `sync_state` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'HELP_NEEDED';

-- AlterTable
ALTER TABLE "sync_state" DROP COLUMN "lastPrUpdatedAtSeen",
ADD COLUMN     "lastTagShaSeen" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "claimBranch" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "helper" TEXT,
ADD COLUMN     "repoTaskNumber" INTEGER;

-- CreateTable
CREATE TABLE "github_events" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "branch" TEXT,
    "actorLogin" TEXT,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "github_events_processedAt_idx" ON "github_events"("processedAt");

-- CreateIndex
CREATE INDEX "github_events_repoId_createdAt_idx" ON "github_events"("repoId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "github_events_repoId_eventType_externalId_key" ON "github_events"("repoId", "eventType", "externalId");

-- AddForeignKey
ALTER TABLE "github_events" ADD CONSTRAINT "github_events_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
