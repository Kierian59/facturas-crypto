-- Inversión del sujeto pasivo (gastos de proveedores extranjeros)
ALTER TABLE "Expense" ADD COLUMN "inversionSujetoPasivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Expense" ADD COLUMN "paisProveedor" TEXT NOT NULL DEFAULT 'ES';
ALTER TABLE "Expense" ADD COLUMN "rcRate" DOUBLE PRECISION NOT NULL DEFAULT 21;
