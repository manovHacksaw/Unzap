"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const address = searchParams.get("address");

    // Try to find deployment ID from localStorage cache
    if (address) {
      try {
        const cached = localStorage.getItem("unzap:history");
        if (cached) {
          const parsed = JSON.parse(cached);
          const match = parsed.deployments?.find(
            (d: { contractAddress: string; id: string }) =>
              d.contractAddress.toLowerCase() === address.toLowerCase()
          );
          if (match?.id) {
            router.replace(`/deployments/${match.id}`);
            return;
          }
        }
      } catch { /* ignore */ }
    }

    // Fallback: go to deployments list
    router.replace("/deployments");
  }, [router, searchParams]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#050505] gap-3 text-neutral-700">
      <Loader2 size={16} className="animate-spin" />
      <span className="font-mono text-xs">Redirecting…</span>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#050505] gap-3 text-neutral-700">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-mono text-xs">Loading…</span>
      </div>
    }>
      <Redirect />
    </Suspense>
  );
}
