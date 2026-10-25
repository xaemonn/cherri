-- AlterEnum
ALTER TYPE "Language" ADD VALUE 'kn';

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "diastolic" INTEGER,
ADD COLUMN     "systolic" INTEGER,
ADD COLUMN     "weightKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "deliveryDate" DATE,
ADD COLUMN     "dueDate" DATE,
ADD COLUMN     "familyHistory" TEXT[],
ADD COLUMN     "menarcheAge" INTEGER,
ADD COLUMN     "surgeries" TEXT;

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT,
    "schedule" TEXT,
    "reason" TEXT,
    "startedOn" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomStory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "structured" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymptomStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_userId_idx" ON "Medication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomStory_userId_key" ON "SymptomStory"("userId");

-- CreateIndex
CREATE INDEX "TrustedContact_userId_idx" ON "TrustedContact"("userId");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomStory" ADD CONSTRAINT "SymptomStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedContact" ADD CONSTRAINT "TrustedContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
