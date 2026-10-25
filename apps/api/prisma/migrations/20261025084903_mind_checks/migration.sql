-- CreateTable
CREATE TABLE "MindCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "band" TEXT NOT NULL,
    "selfHarm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MindCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MindCheck_userId_type_createdAt_idx" ON "MindCheck"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "MindCheck" ADD CONSTRAINT "MindCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
