"use client";

import { PageTitle } from "@/components/ui";
import { ClientForm } from "@/components/ClientForm";

export default function NouveauClientPage() {
  return (
    <div>
      <PageTitle kicker="Clients" title="Nouvelle marca" />
      <ClientForm />
    </div>
  );
}
