"use client";

import { PageTitle } from "@/components/ui";
import { ClientForm } from "@/components/ClientForm";
import { useT } from "@/lib/store";

export default function NouveauClientPage() {
  const t = useT();
  return (
    <div>
      <PageTitle kicker={t.clients.title} title={t.clients.newTitle} />
      <ClientForm />
    </div>
  );
}
