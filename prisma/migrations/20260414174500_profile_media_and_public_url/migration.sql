-- AlterTable
ALTER TABLE "User"
ADD COLUMN "profileBannerUrl" TEXT,
ADD COLUMN "publicProfileUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_publicProfileUrl_key" ON "User"("publicProfileUrl");
