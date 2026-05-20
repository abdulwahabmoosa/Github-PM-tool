-- DropForeignKey
ALTER TABLE "repos" DROP CONSTRAINT "repos_userId_fkey";

-- DropIndex
DROP INDEX "repos_userId_idx";

-- AlterTable: drop userId (already backfilled to connectedByUserId)
ALTER TABLE "repos" DROP COLUMN "userId";

-- AlterTable: make connectedByUserId required
ALTER TABLE "repos" ALTER COLUMN "connectedByUserId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "repos_connectedByUserId_idx" ON "repos"("connectedByUserId");

-- AddForeignKey
ALTER TABLE "repos" ADD CONSTRAINT "repos_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
