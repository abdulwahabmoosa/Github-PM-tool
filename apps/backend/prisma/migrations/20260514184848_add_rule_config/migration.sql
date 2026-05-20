-- CreateTable
CREATE TABLE "rule_config" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rule_config_repoId_idx" ON "rule_config"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "rule_config_repoId_ruleType_key" ON "rule_config"("repoId", "ruleType");

-- AddForeignKey
ALTER TABLE "rule_config" ADD CONSTRAINT "rule_config_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
