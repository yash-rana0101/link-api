-- CreateEnum
CREATE TYPE "ProfileReportReason" AS ENUM ('SPAM', 'IMPERSONATION', 'HARASSMENT', 'MISINFORMATION', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfileReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "ProfileReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reason" "ProfileReportReason" NOT NULL,
    "details" TEXT,
    "status" "ProfileReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileReport_reporterId_reportedUserId_key" ON "ProfileReport"("reporterId", "reportedUserId");

-- CreateIndex
CREATE INDEX "ProfileReport_reporterId_createdAt_idx" ON "ProfileReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileReport_reportedUserId_createdAt_idx" ON "ProfileReport"("reportedUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileReport_status_createdAt_idx" ON "ProfileReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileReport" ADD CONSTRAINT "ProfileReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileReport" ADD CONSTRAINT "ProfileReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
