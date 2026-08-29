"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClientForm } from "@/components/ClientForm";
import { Button, Empty, PageTitle } from "@/components/ui";
import { useStore, useT } from "@/lib/store";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clients, invoices, deleteClient } = useStore();
  const t = useT();
  const router = useRouter();
  const client = clients.find((c) => c.id === id);
  if (!client) {
    return <Empty title={t.clients.notFound} body={t.clients.notFoundBody} />;
  }
  const used = invoices.some((i) => i.clientId === client.id && i.status !== "brouillon");

  return (
    <div>
      <PageTitle
        kicker={t.clients.title}
        title={client.brand}
        action={
          <Link href={`/facturas/nouvelle?client=${client.id}`}>
            <Button>{t.clients.invoice}</Button>
          </Link>
        }
      />
      <ClientForm existing={client} />
      <div className="mt-8">
        <Button
          variant="danger"
          disabled={used}
          onClick={() => {
            if (!confirm(t.clients.confirmDelete)) return;
            deleteClient(client.id);
            router.push("/clients");
          }}
        >
          {t.clients.delete}
        </Button>
        {used ? (
          <p className="mt-2 text-xs text-muted">
            {t.clients.cannotDelete}
          </p>
        ) : null}
      </div>
    </div>
  );
}
