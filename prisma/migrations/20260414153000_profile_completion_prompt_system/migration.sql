-- AlterTable
ALTER TABLE "User"
ADD COLUMN "currentRole" TEXT,
ADD COLUMN "headline" TEXT,
ADD COLUMN "about" TEXT,
ADD COLUMN "profileImageUrl" TEXT;

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Skill_userId_idx" ON "Skill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_userId_name_key" ON "Skill"("userId", "name");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
