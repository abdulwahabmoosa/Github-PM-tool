-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerVerb" TEXT,
    "triggerRef" TEXT,
    "actorLogin" TEXT,
    "automated" BOOLEAN NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_history_taskId_createdAt_idx" ON "status_history"("taskId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
