-- CreateTable
CREATE TABLE "Expense" (
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "supplier" TEXT NOT NULL DEFAULT '',
    "supplierNif" TEXT NOT NULL DEFAULT '',
    "invoiceNo" TEXT NOT NULL DEFAULT '',
    "concept" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'otros',
    "base" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ivaRate" TEXT NOT NULL DEFAULT '21',
    "ivaAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "affectPct" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "ivaDeductible" BOOLEAN NOT NULL DEFAULT true,
    "file" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TEXT NOT NULL DEFAULT '',
    "updatedAt" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("userId","id")
);

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
