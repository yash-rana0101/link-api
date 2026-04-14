-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_VIEWED';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "location" TEXT;

-- Backfill public profile URLs so every user profile is discoverable
UPDATE "User"
SET "publicProfileUrl" = CONCAT('member-', SUBSTRING("id" FROM 1 FOR 12))
WHERE "publicProfileUrl" IS NULL;

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileView_viewerId_createdAt_idx" ON "ProfileView"("viewerId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileView_viewedUserId_createdAt_idx" ON "ProfileView"("viewedUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileView_viewerId_viewedUserId_createdAt_idx" ON "ProfileView"("viewerId", "viewedUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileView" ADD CONSTRAINT "ProfileView_viewedUserId_fkey" FOREIGN KEY ("viewedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
