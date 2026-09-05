"use client";

import { usePathname } from "next/navigation";
import { StoreProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

function isAuthPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAuthPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
