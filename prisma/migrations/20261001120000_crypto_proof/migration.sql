-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "cryptoProof" JSONB;

-- CreateTable
CREATE TABLE "ProofFile" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofFile_pkey" PRIMARY KEY ("userId","id")
);

-- CreateIndex
CREATE INDEX "ProofFile_userId_invoiceId_idx" ON "ProofFile"("userId", "invoiceId");
