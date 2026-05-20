-- AlterTable: make repoTaskNumber NOT NULL now that all rows are backfilled
ALTER TABLE "tasks" ALTER COLUMN "repoTaskNumber" SET NOT NULL;

-- CreateIndex: unique constraint per repo
CREATE UNIQUE INDEX "tasks_repoId_repoTaskNumber_key" ON "tasks"("repoId", "repoTaskNumber");
