"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { InvoicePaper } from "@/components/InvoicePaper";
import { Button, Empty } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ImprimerPage() {
  const { id } = useParams<{ id: string }>();
  const { invoices, clients, settings } = useStore();
  const inv = invoices.find((x) => x.id === id);
  const client = clients.find((c) => c.id === inv?.clientId);

  if (!inv) {
    return (
      <div className="p-6">
        <Empty title="Factura introuvable" body="Impossible d’imprimer." />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper-2">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3">
        <Link href={`/facturas/${inv.id}`} className="text-sm text-ink-soft">
          ← Retour
        </Link>
        <Button
          onClick={() => {
            window.print();
          }}
        >
          Télécharger / imprimer A4
        </Button>
      </div>
      <p className="no-print text-center text-xs text-muted py-3">
        Dans la boîte de dialogue, choisis « Enregistrer au format PDF », format A4.
      </p>
      <div className="mx-auto max-w-[210mm] shadow-lg print:shadow-none">
        <InvoicePaper invoice={inv} client={client} settings={settings} />
      </div>
    </div>
  );
}
