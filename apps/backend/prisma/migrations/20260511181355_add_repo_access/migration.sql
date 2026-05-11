-- AlterTable
ALTER TABLE "repos" ADD COLUMN     "connectedByUserId" TEXT;

-- CreateTable
CREATE TABLE "repo_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repo_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repo_access_userId_idx" ON "repo_access"("userId");

-- CreateIndex
CREATE INDEX "repo_access_repoId_idx" ON "repo_access"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "repo_access_userId_repoId_key" ON "repo_access"("userId", "repoId");

-- AddForeignKey
ALTER TABLE "repo_access" ADD CONSTRAINT "repo_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_access" ADD CONSTRAINT "repo_access_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
