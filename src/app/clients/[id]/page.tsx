"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClientForm } from "@/components/ClientForm";
import { Button, Empty, PageTitle } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clients, invoices, deleteClient } = useStore();
  const router = useRouter();
  const client = clients.find((c) => c.id === id);
  if (!client) {
    return <Empty title="Client introuvable" body="Ce contact n’est plus dans le classeur." />;
  }
  const used = invoices.some((i) => i.clientId === client.id && i.status !== "brouillon");

  return (
    <div>
      <PageTitle
        kicker="Clients"
        title={client.brand}
        action={
          <Link href={`/facturas/nouvelle?client=${client.id}`}>
            <Button>Factura</Button>
          </Link>
        }
      />
      <ClientForm existing={client} />
      <div className="mt-8">
        <Button
          variant="danger"
          disabled={used}
          onClick={() => {
            if (!confirm("Supprimer cette marca ?")) return;
            deleteClient(client.id);
            router.push("/clients");
          }}
        >
          Supprimer
        </Button>
        {used ? (
          <p className="mt-2 text-xs text-muted">
            Des facturas émises y sont liées : on ne supprime pas le client.
          </p>
        ) : null}
      </div>
    </div>
  );
}
