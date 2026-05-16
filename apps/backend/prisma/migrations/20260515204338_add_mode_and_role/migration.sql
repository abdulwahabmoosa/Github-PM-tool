-- AlterTable
ALTER TABLE "repo_access" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "repos" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'OPEN';

-- DataMigration: convert legacy role values to new system
-- 'owner' → 'ADMIN' (ownership is now tracked by repos.connectedByUserId)
-- 'member' → 'MEMBER'
UPDATE "repo_access" SET "role" = 'ADMIN' WHERE "role" = 'owner';
UPDATE "repo_access" SET "role" = 'MEMBER' WHERE "role" = 'member';
