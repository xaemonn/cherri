-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR');

-- CreateEnum
CREATE TYPE "DoctorSpecialty" AS ENUM ('GYNAECOLOGIST', 'OBSTETRICIAN', 'ENDOCRINOLOGIST');

-- CreateEnum
CREATE TYPE "ConsultCategory" AS ENUM ('LAB_REVIEW', 'MEDICATION_SIDE_EFFECTS', 'PERIOD_IRREGULARITY', 'GENERAL_SYMPTOMS');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('AWAITING_REVIEW', 'IN_CONSULTATION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConsultSender" AS ENUM ('PATIENT', 'DOCTOR', 'SYSTEM');

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "pbac" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'PATIENT';

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" "DoctorSpecialty" NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "category" "ConsultCategory" NOT NULL,
    "status" "ConsultStatus" NOT NULL DEFAULT 'AWAITING_REVIEW',
    "tags" TEXT[],
    "snapshot" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "emergencyAt" TIMESTAMP(3),
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "inPersonAdvisedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultMessage" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "sender" "ConsultSender" NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "tests" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dueOn" DATE NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE INDEX "Consultation_patientId_updatedAt_idx" ON "Consultation"("patientId", "updatedAt");

-- CreateIndex
CREATE INDEX "Consultation_status_updatedAt_idx" ON "Consultation"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ConsultMessage_consultationId_createdAt_idx" ON "ConsultMessage"("consultationId", "createdAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_dueOn_idx" ON "Reminder"("userId", "dueOn");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultMessage" ADD CONSTRAINT "ConsultMessage_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
